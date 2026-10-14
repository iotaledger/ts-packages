// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Code, ConnectError } from '@connectrpc/connect';
import { beforeAll, describe, expect, it } from 'vitest';

import type { GrpcNetwork } from '../../src/index.js';
import { BadRequestSchema } from '../../src/proto/google/rpc/error_details_pb.js';
import {
    CheckpointResponseField,
    DEFAULT_READ_MASKS,
    DynamicFieldField,
    EpochField,
    ObjectField,
    OwnedObjectField,
    ServiceInfoField,
    toReadMask,
    TransactionField,
} from '../../src/read-masks.js';
import { IotaGrpcTestClient } from '../test-client.js';

/**
 * Every named path against every public network. A failure here is not always
 * a bug in the mask: it can mean that network runs a node older than the
 * protos, which is the minimum-version information this suite exists to find.
 */
const NETWORKS: GrpcNetwork[] = ['mainnet', 'testnet', 'devnet'];

const IOTA_SYSTEM_STATE_OBJECT_ID = new Uint8Array(32);
IOTA_SYSTEM_STATE_OBJECT_ID[31] = 0x5;

/** The server validates the mask before looking the owner up, so any address works. */
const ANY_OWNER = new Uint8Array(32);

async function drain<T>(stream: AsyncIterable<T>): Promise<T[]> {
    const frames: T[] = [];
    for await (const frame of stream) frames.push(frame);
    return frames;
}

describe.each(NETWORKS)('%s', (network) => {
    const client = new IotaGrpcTestClient({ network });
    let transactionDigest: Uint8Array;

    beforeAll(async () => {
        const frames = await drain(
            client.ledger.getCheckpoint({
                checkpointId: { case: 'latest', value: true },
                readMask: toReadMask(CheckpointResponseField.TRANSACTIONS_TRANSACTION_DIGEST, []),
            }),
        );
        const digest = frames.flatMap((frame) =>
            frame.payload.case === 'executedTransactions'
                ? frame.payload.value.executedTransactions
                : [],
        )[0]?.transaction?.digest?.digest;

        if (!digest) throw new Error('latest checkpoint has no transactions');
        transactionDigest = digest;
    });

    const call = {
        getServiceInfo: (paths: readonly string[]) =>
            client.ledger.getServiceInfo({ readMask: toReadMask(paths, []) }),
        getEpoch: (paths: readonly string[]) =>
            client.ledger.getEpoch({ readMask: toReadMask(paths, []) }),
        getObjects: (paths: readonly string[]) =>
            drain(
                client.ledger.getObjects({
                    requests: {
                        requests: [
                            { objectRef: { objectId: { objectId: IOTA_SYSTEM_STATE_OBJECT_ID } } },
                        ],
                    },
                    readMask: toReadMask(paths, []),
                }),
            ),
        getTransactions: (paths: readonly string[]) =>
            drain(
                client.ledger.getTransactions({
                    requests: { requests: [{ digest: { digest: transactionDigest } }] },
                    readMask: toReadMask(paths, []),
                }),
            ),
        getCheckpoint: (paths: readonly string[]) =>
            drain(
                client.ledger.getCheckpoint({
                    checkpointId: { case: 'latest', value: true },
                    readMask: toReadMask(paths, []),
                }),
            ),
        listDynamicFields: (paths: readonly string[]) =>
            client.state.listDynamicFields({
                parent: { objectId: IOTA_SYSTEM_STATE_OBJECT_ID },
                pageSize: 1,
                readMask: toReadMask(paths, []),
            }),
        listOwnedObjects: (paths: readonly string[]) =>
            client.state.listOwnedObjects({
                owner: { address: ANY_OWNER },
                pageSize: 1,
                readMask: toReadMask(paths, []),
            }),
    };

    describe.concurrent('defaults are accepted', () => {
        it.each(Object.keys(call) as (keyof typeof call)[])('%s', async (method) => {
            await expect(call[method](DEFAULT_READ_MASKS[method])).resolves.toBeDefined();
        });
    });

    describe.concurrent.each([
        ['getServiceInfo', ServiceInfoField],
        ['getEpoch', EpochField],
        ['getObjects', ObjectField],
        ['getTransactions', TransactionField],
        ['getCheckpoint', CheckpointResponseField],
        ['listDynamicFields', DynamicFieldField],
        ['listOwnedObjects', OwnedObjectField],
    ] as const)('%s accepts every named field', (method, namespace) => {
        it.each(Object.entries(namespace))('%s', async (_, path) => {
            await expect(call[method]([path])).resolves.toBeDefined();
        });
    });

    it('fills exactly the fields a mask selects', async () => {
        const info = await call.getServiceInfo([ServiceInfoField.SERVER]);
        expect(info.server).toMatch(/^iota-node\//);
        expect(info.epoch).toBeUndefined();
        expect(info.chainId).toBeUndefined();
    });

    it('returns no fields for an empty mask', async () => {
        const info = await call.getServiceInfo([]);
        expect(info.chainId).toBeUndefined();
        expect(info.epoch).toBeUndefined();
        expect(info.server).toBeUndefined();
    });

    it('applies the server default when no mask is sent', async () => {
        const info = await client.ledger.getServiceInfo({});
        expect(info.chainId).toBeDefined();
        expect(info.epoch).toBeGreaterThan(0n);
        expect(info.server).toBeUndefined();
    });

    it('rejects an unknown path with a BadRequest on read_mask', async () => {
        const error = await call.getServiceInfo(['checkpoint_height']).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ConnectError);
        const connectError = error as ConnectError;
        expect(connectError.code).toBe(Code.InvalidArgument);
        expect(connectError.rawMessage).toContain('checkpoint_height');

        const [badRequest] = connectError.findDetails(BadRequestSchema);
        expect(badRequest?.fieldViolations[0]?.field).toBe('read_mask');
    });
});
