// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { HandlerContext, ServiceImpl } from '@connectrpc/connect';
import { Code, ConnectError, createRouterTransport } from '@connectrpc/connect';
import { toBase58 } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { IotaGrpcClient, TransportError } from '../../src/index.js';
import type { ListPackageVersionsRequest } from '../../src/proto/iota/grpc/v1/move_package_service_pb.js';
import { MovePackageService } from '../../src/proto/iota/grpc/v1/move_package_service_pb.js';

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

function clientFor(
    movePackage: Partial<ServiceImpl<typeof MovePackageService>>,
    options: { maxMessageSizeBytes?: number } = {},
) {
    return new IotaGrpcClient({
        ...options,
        transport: createRouterTransport(({ service }) => service(MovePackageService, movePackage)),
    });
}

describe('listPackageVersions', () => {
    it('sends the padded package ID and the message size', async () => {
        const requests: ListPackageVersionsRequest[] = [];
        const client = clientFor(
            {
                listPackageVersions(request) {
                    requests.push(request);
                    return {};
                },
            },
            { maxMessageSizeBytes: 8 * 1024 * 1024 },
        );

        await client.listPackageVersions('0x7');

        const [request] = requests;
        expect(request.packageId?.objectId).toEqual(bytes32(7));
        expect(request.pageSize).toBeUndefined();
        expect(request.pageToken).toBeUndefined();
        expect(request.maxMessageSizeBytes).toBe(8 * 1024 * 1024);
    });

    it('sends the given page', async () => {
        const requests: ListPackageVersionsRequest[] = [];
        const client = clientFor({
            listPackageVersions(request) {
                requests.push(request);
                return {};
            },
        });

        await client.listPackageVersions('0x7', { pageSize: 10, pageToken: NEXT_PAGE });

        const [request] = requests;
        expect(request.pageSize).toBe(10);
        expect(request.pageToken).toEqual(NEXT_PAGE);
    });

    it('returns the versions, the next page token and the metadata', async () => {
        const client = clientFor({
            listPackageVersions(_request, context) {
                sendMetadata(context);
                return {
                    versions: [packageVersion(1n), packageVersion(2n)],
                    nextPageToken: NEXT_PAGE,
                };
            },
        });

        const { body, metadata } = await client.listPackageVersions('0x7');

        expect(body.items.map(({ version }) => version)).toEqual([1n, 2n]);
        expect(body.items[0].originalId?.objectId).toEqual(bytes32(7));
        expect(body.nextPageToken).toEqual(NEXT_PAGE);
        expect(metadata).toMatchObject(METADATA);
    });

    it('rejects a malformed package ID without calling the node', async () => {
        let called = false;
        const client = clientFor({
            listPackageVersions() {
                called = true;
                return {};
            },
        });

        await expect(client.listPackageVersions('not-an-id')).rejects.toThrow(TypeError);
        expect(called).toBe(false);
    });

    it('maps a failed call to a TransportError', async () => {
        const client = clientFor({
            listPackageVersions() {
                throw new ConnectError('package not found', Code.NotFound);
            },
        });

        const error = await client.listPackageVersions('0x7').catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.NotFound, detail: 'package not found' });
    });
});

describe('listAllPackageVersions', () => {
    it('follows the page token, sending the same request for every page', async () => {
        const requests: ListPackageVersionsRequest[] = [];
        const client = clientFor({
            listPackageVersions(request) {
                requests.push(request);
                return request.pageToken === undefined
                    ? { versions: [packageVersion(1n)], nextPageToken: NEXT_PAGE }
                    : { versions: [packageVersion(2n)] };
            },
        });

        await client.listAllPackageVersions('0x7', { pageSize: 1 });

        expect(requests.map(({ pageToken }) => pageToken)).toEqual([undefined, NEXT_PAGE]);
        for (const request of requests) {
            expect(request.packageId?.objectId).toEqual(bytes32(7));
            expect(request.pageSize).toBe(1);
        }
    });

    it("returns every page's versions in order, with the first page's metadata", async () => {
        const client = clientFor({
            listPackageVersions(request, context) {
                if (request.pageToken === undefined) {
                    sendMetadata(context);
                    return {
                        versions: [packageVersion(1n), packageVersion(2n)],
                        nextPageToken: NEXT_PAGE,
                    };
                }
                context.responseHeader.set('x-iota-epoch', '43');
                return { versions: [packageVersion(3n)] };
            },
        });

        const { body, metadata } = await client.listAllPackageVersions('0x7');

        expect(body.map(({ version }) => version)).toEqual([1n, 2n, 3n]);
        expect(metadata).toMatchObject(METADATA);
    });

    it.each([
        [{ pageSize: 2, limit: 5 }, [2, 2, 1]],
        [{ limit: 3 }, [3]],
    ])(
        'stops at the limit, asking no page for more than it still needs: %o',
        async (options, sizes) => {
            const requests: ListPackageVersionsRequest[] = [];
            const client = clientFor({
                listPackageVersions(request) {
                    requests.push(request);
                    return {
                        versions: Array(request.pageSize!).fill(packageVersion(1n)),
                        nextPageToken: NEXT_PAGE,
                    };
                },
            });

            const { body } = await client.listAllPackageVersions('0x7', options);

            expect(body).toHaveLength(options.limit);
            expect(requests.map(({ pageSize }) => pageSize)).toEqual(sizes);
        },
    );

    it.each([0, -1, 1.5])('rejects a limit of %s without calling the node', async (limit) => {
        let called = false;
        const client = clientFor({
            listPackageVersions() {
                called = true;
                return {};
            },
        });

        await expect(client.listAllPackageVersions('0x7', { limit })).rejects.toThrow(RangeError);
        expect(called).toBe(false);
    });

    it('maps a failure on a later page to a TransportError', async () => {
        const client = clientFor({
            listPackageVersions(request) {
                if (request.pageToken === undefined) {
                    return { versions: [packageVersion(1n)], nextPageToken: NEXT_PAGE };
                }
                throw new ConnectError('node is shutting down', Code.Unavailable);
            },
        });

        const error = await client.listAllPackageVersions('0x7').catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unavailable });
    });
});

/** A 32-byte value whose last byte is `last`, like the ID `0x…<last>`. */
function bytes32(last: number): Uint8Array {
    const bytes = new Uint8Array(32);
    bytes[31] = last;
    return bytes;
}

/** A version of the package `0x7`, stored at `0x…<version>`. */
function packageVersion(version: bigint) {
    return {
        originalId: { objectId: bytes32(7) },
        storageId: { objectId: bytes32(Number(version)) },
        version,
    };
}
