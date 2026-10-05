// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { HandlerContext, ServiceImpl } from '@connectrpc/connect';
import { Code, ConnectError, createRouterTransport } from '@connectrpc/connect';
import { fromHex, toBase58 } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import {
    DEFAULT_READ_MASKS,
    DynamicFieldField,
    IotaGrpcClient,
    normalizeReadMask,
    OwnedObjectField,
    ProtoConversionError,
    TransportError,
} from '../../src/index.js';
import type {
    GetCoinInfoRequest,
    ListDynamicFieldsRequest,
    ListOwnedObjectsRequest,
} from '../../src/proto/iota/grpc/v1/state_service_pb.js';
import { StateService } from '../../src/proto/iota/grpc/v1/state_service_pb.js';

const CHAIN_ID = toBase58(new Uint8Array(32).fill(1));

function sendMetadata(context: HandlerContext) {
    context.responseHeader.set('x-iota-chain-id', CHAIN_ID);
    context.responseHeader.set('x-iota-chain', 'testnet');
    context.responseHeader.set('x-iota-epoch', '42');
    context.responseHeader.set('x-iota-checkpoint-height', '1000');
}

const METADATA = {
    chainId: CHAIN_ID,
    chain: 'testnet',
    epoch: 42n,
    checkpointHeight: 1000n,
};

const NEXT_PAGE = new Uint8Array([1]);

/** Objects from mainnet, as the node sends them. */
const objects = JSON.parse(
    readFileSync(path.resolve(__dirname, '../fixtures/objects.json'), 'utf8'),
).objects as { kind: string; objectId: string; bcs: string }[];

const GAS_COIN = objects.find(({ kind }) => kind === 'Struct/GasCoin/Address')!;
const COIN = objects.find(({ kind }) => kind === 'Struct/Coin/Address')!;
const NOT_A_COIN = objects.find(({ kind }) => kind === 'Struct/Other/Address')!;

function clientFor(
    state: Partial<ServiceImpl<typeof StateService>>,
    options: { maxMessageSizeBytes?: number } = {},
) {
    return new IotaGrpcClient({
        ...options,
        transport: createRouterTransport(({ service }) => service(StateService, state)),
    });
}

describe('listOwnedObjects', () => {
    it('sends the padded owner, the default read mask and the message size', async () => {
        const requests: ListOwnedObjectsRequest[] = [];
        const client = clientFor(
            {
                listOwnedObjects(request) {
                    requests.push(request);
                    return {};
                },
            },
            { maxMessageSizeBytes: 8 * 1024 * 1024 },
        );

        await client.listOwnedObjects('0x5');

        const [request] = requests;
        expect(request.owner?.address).toEqual(bytes32(5));
        expect(request.objectType).toBeUndefined();
        expect(request.pageSize).toBeUndefined();
        expect(request.pageToken).toBeUndefined();
        expect(request.readMask?.paths).toEqual(
            normalizeReadMask(DEFAULT_READ_MASKS.listOwnedObjects),
        );
        expect(request.maxMessageSizeBytes).toBe(8 * 1024 * 1024);
    });

    it('sends the given type filter, page and read mask', async () => {
        const requests: ListOwnedObjectsRequest[] = [];
        const client = clientFor({
            listOwnedObjects(request) {
                requests.push(request);
                return {};
            },
        });

        await client.listOwnedObjects('0x5', {
            objectType: '0x2::coin::Coin',
            pageSize: 10,
            pageToken: NEXT_PAGE,
            readMask: OwnedObjectField.REFERENCE,
        });

        const [request] = requests;
        expect(request.objectType).toBe('0x2::coin::Coin');
        expect(request.pageSize).toBe(10);
        expect(request.pageToken).toEqual(NEXT_PAGE);
        expect(request.readMask?.paths).toEqual(['reference']);
    });

    it('returns the objects, the next page token and the metadata', async () => {
        const client = clientFor({
            listOwnedObjects(_request, context) {
                sendMetadata(context);
                return { objects: [ownedObject(1), ownedObject(2)], nextPageToken: NEXT_PAGE };
            },
        });

        const { body, metadata } = await client.listOwnedObjects('0x5');

        expect(body.items.map(objectIdOf)).toEqual([bytes32(1), bytes32(2)]);
        expect(body.nextPageToken).toEqual(NEXT_PAGE);
        expect(metadata).toMatchObject(METADATA);
    });

    it('rejects a malformed owner without calling the node', async () => {
        let called = false;
        const client = clientFor({
            listOwnedObjects() {
                called = true;
                return {};
            },
        });

        await expect(client.listOwnedObjects('not-an-address')).rejects.toThrow(TypeError);
        expect(called).toBe(false);
    });

    it('maps a failed call to a TransportError', async () => {
        const client = clientFor({
            listOwnedObjects() {
                throw new ConnectError('invalid page token', Code.InvalidArgument);
            },
        });

        const error = await client.listOwnedObjects('0x5').catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.InvalidArgument, detail: 'invalid page token' });
    });
});

describe('listAllOwnedObjects', () => {
    it('follows the page token, sending the same request for every page', async () => {
        const requests: ListOwnedObjectsRequest[] = [];
        const client = clientFor({
            listOwnedObjects(request) {
                requests.push(request);
                return request.pageToken === undefined
                    ? { objects: [ownedObject(1)], nextPageToken: NEXT_PAGE }
                    : { objects: [ownedObject(2)] };
            },
        });

        await client.listAllOwnedObjects('0x5', {
            objectType: '0x2::coin::Coin',
            pageSize: 1,
            readMask: OwnedObjectField.REFERENCE,
        });

        expect(requests.map(({ pageToken }) => pageToken)).toEqual([undefined, NEXT_PAGE]);
        for (const request of requests) {
            expect(request.owner?.address).toEqual(bytes32(5));
            expect(request.objectType).toBe('0x2::coin::Coin');
            expect(request.pageSize).toBe(1);
            expect(request.readMask?.paths).toEqual(['reference']);
        }
    });

    it("returns every page's objects in order, with the first page's metadata", async () => {
        const client = clientFor({
            listOwnedObjects(request, context) {
                if (request.pageToken === undefined) {
                    sendMetadata(context);
                    return { objects: [ownedObject(1), ownedObject(2)], nextPageToken: NEXT_PAGE };
                }
                context.responseHeader.set('x-iota-epoch', '43');
                return { objects: [ownedObject(3)] };
            },
        });

        const { body, metadata } = await client.listAllOwnedObjects('0x5');

        expect(body.map(objectIdOf)).toEqual([bytes32(1), bytes32(2), bytes32(3)]);
        expect(metadata).toMatchObject(METADATA);
    });

    it.each([
        [{ pageSize: 2, limit: 5 }, [2, 2, 1]],
        [{ limit: 3 }, [3]],
    ])(
        'stops at the limit, asking no page for more than it still needs: %o',
        async (options, sizes) => {
            const requests: ListOwnedObjectsRequest[] = [];
            const client = clientFor({
                listOwnedObjects(request) {
                    requests.push(request);
                    return { objects: ownedObjects(request.pageSize!), nextPageToken: NEXT_PAGE };
                },
            });

            const { body } = await client.listAllOwnedObjects('0x5', options);

            expect(body).toHaveLength(options.limit);
            expect(requests.map(({ pageSize }) => pageSize)).toEqual(sizes);
        },
    );

    it.each([0, -1, 1.5])('rejects a limit of %s without calling the node', async (limit) => {
        let called = false;
        const client = clientFor({
            listOwnedObjects() {
                called = true;
                return {};
            },
        });

        await expect(client.listAllOwnedObjects('0x5', { limit })).rejects.toThrow(RangeError);
        expect(called).toBe(false);
    });

    it('maps a failure on a later page to a TransportError', async () => {
        const client = clientFor({
            listOwnedObjects(request) {
                if (request.pageToken === undefined) {
                    return { objects: [ownedObject(1)], nextPageToken: NEXT_PAGE };
                }
                throw new ConnectError('node is shutting down', Code.Unavailable);
            },
        });

        const error = await client.listAllOwnedObjects('0x5').catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unavailable });
    });
});

describe('listCoins', () => {
    it('sends the coin type of every coin, the reference and BCS mask, and the given page', async () => {
        const requests: ListOwnedObjectsRequest[] = [];
        const client = clientFor({
            listOwnedObjects(request) {
                requests.push(request);
                return {};
            },
        });

        await client.listCoins('0x5', { pageSize: 10, pageToken: NEXT_PAGE });

        const [request] = requests;
        expect(request.owner?.address).toEqual(bytes32(5));
        expect(request.objectType).toBe('0x2::coin::Coin');
        expect(request.pageSize).toBe(10);
        expect(request.pageToken).toEqual(NEXT_PAGE);
        expect(request.readMask?.paths).toEqual(
            normalizeReadMask(DEFAULT_READ_MASKS.listOwnedObjects),
        );
    });

    it('sends the given coin type wrapped in Coin<…>', async () => {
        const requests: ListOwnedObjectsRequest[] = [];
        const client = clientFor({
            listOwnedObjects(request) {
                requests.push(request);
                return {};
            },
        });

        await client.listCoins('0x5', { coinType: '0x2::iota::IOTA' });

        expect(requests[0].objectType).toBe('0x2::coin::Coin<0x2::iota::IOTA>');
    });

    it('returns the objects decoded into coins, the next page token and the metadata', async () => {
        const client = clientFor({
            listOwnedObjects(_request, context) {
                sendMetadata(context);
                return {
                    objects: [fixtureObject(GAS_COIN), fixtureObject(COIN)],
                    nextPageToken: NEXT_PAGE,
                };
            },
        });

        const { body, metadata } = await client.listCoins('0x5');

        expect(body.items.map(({ id }) => id)).toEqual([GAS_COIN.objectId, COIN.objectId]);
        expect(body.items[0].coinType).toBe(`${FRAMEWORK}::iota::IOTA`);
        expect(body.nextPageToken).toEqual(NEXT_PAGE);
        expect(metadata).toMatchObject(METADATA);
    });

    it('rejects an object that is not a coin', async () => {
        const client = clientFor({
            listOwnedObjects() {
                return { objects: [fixtureObject(NOT_A_COIN)] };
            },
        });

        await expect(client.listCoins('0x5')).rejects.toThrow(ProtoConversionError);
    });

    it('rejects a malformed owner without calling the node', async () => {
        let called = false;
        const client = clientFor({
            listOwnedObjects() {
                called = true;
                return {};
            },
        });

        await expect(client.listCoins('not-an-address')).rejects.toThrow(TypeError);
        expect(called).toBe(false);
    });

    it('maps a failed call to a TransportError', async () => {
        const client = clientFor({
            listOwnedObjects() {
                throw new ConnectError('invalid coin type', Code.InvalidArgument);
            },
        });

        const error = await client.listCoins('0x5').catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.InvalidArgument, detail: 'invalid coin type' });
    });
});

describe('listAllCoins', () => {
    it('follows the page token, sending the same request for every page', async () => {
        const requests: ListOwnedObjectsRequest[] = [];
        const client = clientFor({
            listOwnedObjects(request) {
                requests.push(request);
                return request.pageToken === undefined
                    ? { objects: [fixtureObject(GAS_COIN)], nextPageToken: NEXT_PAGE }
                    : { objects: [fixtureObject(COIN)] };
            },
        });

        await client.listAllCoins('0x5', { coinType: '0x2::iota::IOTA', pageSize: 1 });

        expect(requests.map(({ pageToken }) => pageToken)).toEqual([undefined, NEXT_PAGE]);
        for (const request of requests) {
            expect(request.owner?.address).toEqual(bytes32(5));
            expect(request.objectType).toBe('0x2::coin::Coin<0x2::iota::IOTA>');
            expect(request.pageSize).toBe(1);
            expect(request.readMask?.paths).toEqual(
                normalizeReadMask(DEFAULT_READ_MASKS.listOwnedObjects),
            );
        }
    });

    it("returns every page's coins in order, with the first page's metadata", async () => {
        const client = clientFor({
            listOwnedObjects(request, context) {
                if (request.pageToken === undefined) {
                    sendMetadata(context);
                    return { objects: [fixtureObject(GAS_COIN)], nextPageToken: NEXT_PAGE };
                }
                context.responseHeader.set('x-iota-epoch', '43');
                return { objects: [fixtureObject(COIN)] };
            },
        });

        const { body, metadata } = await client.listAllCoins('0x5');

        expect(body.map(({ id }) => id)).toEqual([GAS_COIN.objectId, COIN.objectId]);
        expect(metadata).toMatchObject(METADATA);
    });

    it.each([
        [{ pageSize: 2, limit: 5 }, [2, 2, 1]],
        [{ limit: 3 }, [3]],
    ])(
        'stops at the limit, asking no page for more than it still needs: %o',
        async (options, sizes) => {
            const requests: ListOwnedObjectsRequest[] = [];
            const client = clientFor({
                listOwnedObjects(request) {
                    requests.push(request);
                    return {
                        objects: Array(request.pageSize!).fill(fixtureObject(GAS_COIN)),
                        nextPageToken: NEXT_PAGE,
                    };
                },
            });

            const { body } = await client.listAllCoins('0x5', options);

            expect(body).toHaveLength(options.limit);
            expect(requests.map(({ pageSize }) => pageSize)).toEqual(sizes);
        },
    );

    it.each([0, -1, 1.5])('rejects a limit of %s without calling the node', async (limit) => {
        let called = false;
        const client = clientFor({
            listOwnedObjects() {
                called = true;
                return {};
            },
        });

        await expect(client.listAllCoins('0x5', { limit })).rejects.toThrow(RangeError);
        expect(called).toBe(false);
    });

    it('maps a failure on a later page to a TransportError', async () => {
        const client = clientFor({
            listOwnedObjects(request) {
                if (request.pageToken === undefined) {
                    return { objects: [fixtureObject(GAS_COIN)], nextPageToken: NEXT_PAGE };
                }
                throw new ConnectError('node is shutting down', Code.Unavailable);
            },
        });

        const error = await client.listAllCoins('0x5').catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unavailable });
    });
});

describe('listDynamicFields', () => {
    it('sends the padded parent, the default read mask and the message size', async () => {
        const requests: ListDynamicFieldsRequest[] = [];
        const client = clientFor(
            {
                listDynamicFields(request) {
                    requests.push(request);
                    return {};
                },
            },
            { maxMessageSizeBytes: 8 * 1024 * 1024 },
        );

        await client.listDynamicFields('0x5');

        const [request] = requests;
        expect(request.parent?.objectId).toEqual(bytes32(5));
        expect(request.pageSize).toBeUndefined();
        expect(request.pageToken).toBeUndefined();
        expect(request.readMask?.paths).toEqual(
            normalizeReadMask(DEFAULT_READ_MASKS.listDynamicFields),
        );
        expect(request.maxMessageSizeBytes).toBe(8 * 1024 * 1024);
    });

    it('sends the given page and read mask', async () => {
        const requests: ListDynamicFieldsRequest[] = [];
        const client = clientFor({
            listDynamicFields(request) {
                requests.push(request);
                return {};
            },
        });

        await client.listDynamicFields('0x5', {
            pageSize: 10,
            pageToken: NEXT_PAGE,
            readMask: [DynamicFieldField.NAME],
        });

        const [request] = requests;
        expect(request.pageSize).toBe(10);
        expect(request.pageToken).toEqual(NEXT_PAGE);
        expect(request.readMask?.paths).toEqual(['name']);
    });

    it('returns the fields, the next page token and the metadata', async () => {
        const client = clientFor({
            listDynamicFields(_request, context) {
                sendMetadata(context);
                return {
                    dynamicFields: [dynamicField(1), dynamicField(2)],
                    nextPageToken: NEXT_PAGE,
                };
            },
        });

        const { body, metadata } = await client.listDynamicFields('0x5');

        expect(body.items.map(fieldIdOf)).toEqual([bytes32(1), bytes32(2)]);
        expect(body.nextPageToken).toEqual(NEXT_PAGE);
        expect(metadata).toMatchObject(METADATA);
    });

    it('rejects a malformed parent without calling the node', async () => {
        let called = false;
        const client = clientFor({
            listDynamicFields() {
                called = true;
                return {};
            },
        });

        await expect(client.listDynamicFields('not-an-id')).rejects.toThrow(TypeError);
        expect(called).toBe(false);
    });

    it('maps a failed call to a TransportError', async () => {
        const client = clientFor({
            listDynamicFields() {
                throw new ConnectError('invalid page token', Code.InvalidArgument);
            },
        });

        const error = await client.listDynamicFields('0x5').catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.InvalidArgument, detail: 'invalid page token' });
    });
});

describe('listAllDynamicFields', () => {
    it('follows the page token, sending the same request for every page', async () => {
        const requests: ListDynamicFieldsRequest[] = [];
        const client = clientFor({
            listDynamicFields(request) {
                requests.push(request);
                return request.pageToken === undefined
                    ? { dynamicFields: [dynamicField(1)], nextPageToken: NEXT_PAGE }
                    : { dynamicFields: [dynamicField(2)] };
            },
        });

        await client.listAllDynamicFields('0x5', {
            pageSize: 1,
            readMask: [DynamicFieldField.NAME],
        });

        expect(requests.map(({ pageToken }) => pageToken)).toEqual([undefined, NEXT_PAGE]);
        for (const request of requests) {
            expect(request.parent?.objectId).toEqual(bytes32(5));
            expect(request.pageSize).toBe(1);
            expect(request.readMask?.paths).toEqual(['name']);
        }
    });

    it("returns every page's fields in order, with the first page's metadata", async () => {
        const client = clientFor({
            listDynamicFields(request, context) {
                if (request.pageToken === undefined) {
                    sendMetadata(context);
                    return {
                        dynamicFields: [dynamicField(1), dynamicField(2)],
                        nextPageToken: NEXT_PAGE,
                    };
                }
                context.responseHeader.set('x-iota-epoch', '43');
                return { dynamicFields: [dynamicField(3)] };
            },
        });

        const { body, metadata } = await client.listAllDynamicFields('0x5');

        expect(body.map(fieldIdOf)).toEqual([bytes32(1), bytes32(2), bytes32(3)]);
        expect(metadata).toMatchObject(METADATA);
    });

    it.each([
        [{ pageSize: 2, limit: 5 }, [2, 2, 1]],
        [{ limit: 3 }, [3]],
    ])(
        'stops at the limit, asking no page for more than it still needs: %o',
        async (options, sizes) => {
            const requests: ListDynamicFieldsRequest[] = [];
            const client = clientFor({
                listDynamicFields(request) {
                    requests.push(request);
                    return {
                        dynamicFields: Array(request.pageSize!).fill(dynamicField(1)),
                        nextPageToken: NEXT_PAGE,
                    };
                },
            });

            const { body } = await client.listAllDynamicFields('0x5', options);

            expect(body).toHaveLength(options.limit);
            expect(requests.map(({ pageSize }) => pageSize)).toEqual(sizes);
        },
    );

    it.each([0, -1, 1.5])('rejects a limit of %s without calling the node', async (limit) => {
        let called = false;
        const client = clientFor({
            listDynamicFields() {
                called = true;
                return {};
            },
        });

        await expect(client.listAllDynamicFields('0x5', { limit })).rejects.toThrow(RangeError);
        expect(called).toBe(false);
    });

    it('maps a failure on a later page to a TransportError', async () => {
        const client = clientFor({
            listDynamicFields(request) {
                if (request.pageToken === undefined) {
                    return { dynamicFields: [dynamicField(1)], nextPageToken: NEXT_PAGE };
                }
                throw new ConnectError('node is shutting down', Code.Unavailable);
            },
        });

        const error = await client.listAllDynamicFields('0x5').catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unavailable });
    });
});

describe('getCoinInfo', () => {
    it('sends the coin type', async () => {
        const requests: GetCoinInfoRequest[] = [];
        const client = clientFor({
            getCoinInfo(request) {
                requests.push(request);
                return {};
            },
        });

        await client.getCoinInfo('0x2::iota::IOTA');

        expect(requests[0].coinType).toBe('0x2::iota::IOTA');
    });

    it('returns the body with the metadata', async () => {
        const client = clientFor({
            getCoinInfo(_request, context) {
                sendMetadata(context);
                return {
                    coinType: '0x2::iota::IOTA',
                    metadata: { symbol: 'IOTA', decimals: 9 },
                    treasury: { totalSupply: 4_600_000_000_000_000_000n },
                };
            },
        });

        const { body, metadata } = await client.getCoinInfo('0x2::iota::IOTA');

        expect(body.coinType).toBe('0x2::iota::IOTA');
        expect(body.metadata).toMatchObject({ symbol: 'IOTA', decimals: 9 });
        expect(body.treasury?.totalSupply).toBe(4_600_000_000_000_000_000n);
        expect(metadata).toMatchObject(METADATA);
    });

    it('maps a failed call to a TransportError', async () => {
        const client = clientFor({
            getCoinInfo() {
                throw new ConnectError('unknown coin type', Code.NotFound);
            },
        });

        const error = await client.getCoinInfo('0x1::nope::NOPE').catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.NotFound, detail: 'unknown coin type' });
    });
});

const FRAMEWORK = '0x0000000000000000000000000000000000000000000000000000000000000002';

/** A 32-byte value whose last byte is `last`, like the ID `0x…<last>`. */
function bytes32(last: number): Uint8Array {
    const bytes = new Uint8Array(32);
    bytes[31] = last;
    return bytes;
}

function ownedObject(last: number) {
    return { reference: { objectId: { objectId: bytes32(last) } } };
}

function ownedObjects(count: number) {
    return Array.from({ length: count }, (_, i) => ownedObject(i + 1));
}

function objectIdOf(object: { reference?: { objectId?: { objectId: Uint8Array } } }) {
    return object.reference?.objectId?.objectId;
}

function fixtureObject({ bcs }: { bcs: string }) {
    return { bcs: { data: fromHex(bcs) } };
}

function dynamicField(last: number) {
    return { fieldId: { objectId: bytes32(last) } };
}

function fieldIdOf(field: { fieldId?: { objectId: Uint8Array } }) {
    return field.fieldId?.objectId;
}
