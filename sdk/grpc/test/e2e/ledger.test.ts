// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import type { GrpcNetwork } from '../../src/index.js';
import {
    CheckpointResponseField,
    decodeCheckpointSummary,
    decodeObject,
    decodeTransaction,
    IotaGrpcClient,
    objectIdOf,
    ServerError,
    TransactionField,
} from '../../src/index.js';

/** They run different node versions, so every method has to work on each of them. */
const NETWORKS: GrpcNetwork[] = ['mainnet', 'testnet', 'devnet'];

const IOTA_FRAMEWORK = '0x0000000000000000000000000000000000000000000000000000000000000002';
const IOTA_SYSTEM_STATE = '0x0000000000000000000000000000000000000000000000000000000000000005';
const NONEXISTENT_OBJECT = `0x${'ab'.repeat(32)}`;

describe.each(NETWORKS)('%s', (network) => {
    const client = new IotaGrpcClient({ network });

    it('reports itself healthy', async () => {
        const { body, metadata } = await client.getHealth({ thresholdMs: 60_000n });

        expect(body.executedCheckpointHeight).toBeGreaterThan(0n);
        expect(metadata.chainId).toBeDefined();
    });

    it('serves the epoch the metadata reports, and the one before it', async () => {
        const { body: current, metadata } = await client.getEpoch();
        expect(current.epoch).toBe(metadata.epoch);

        const { body: previous } = await client.getEpoch({ epoch: current.epoch! - 1n });
        expect(previous.epoch).toBe(current.epoch! - 1n);
        expect(previous.lastCheckpoint).toBeLessThan(current.firstCheckpoint!);
    });

    it("returns the current epoch's reference gas price", async () => {
        const [{ body: price }, { body: epoch }] = await Promise.all([
            client.getReferenceGasPrice(),
            client.getEpoch(),
        ]);

        expect(price).toBeGreaterThan(0n);
        expect(price).toBe(epoch.referenceGasPrice);
    });

    it('reads system objects and fails only the slot of one that does not exist', async () => {
        const { body } = await client.getObjects(['0x2', NONEXISTENT_OBJECT, { objectId: '0x5' }]);

        const [framework, missing, systemState] = body;

        expect(framework.ok && objectIdOf(decodeObject(framework.value))).toBe(IOTA_FRAMEWORK);
        expect(systemState.ok && objectIdOf(decodeObject(systemState.value))).toBe(
            IOTA_SYSTEM_STATE,
        );
        expect(missing.ok).toBe(false);
        if (missing.ok) return;
        expect(missing.error).toBeInstanceOf(ServerError);
    });

    it('reads a checkpoint by sequence number and by digest, and the same transactions by digest', async () => {
        const { body: latest } = await client.getCheckpoint(undefined, {
            readMask: [
                CheckpointResponseField.CHECKPOINT_SUMMARY,
                CheckpointResponseField.TRANSACTIONS_TRANSACTION_DIGEST,
            ],
        });
        const digest = latest.checkpoint.summary?.digest?.digest;
        expect(digest).toBeDefined();
        // `@iota/bcs` reads a u64 as a decimal string.
        expect(BigInt(decodeCheckpointSummary(latest.checkpoint.summary!).sequenceNumber)).toBe(
            latest.sequenceNumber,
        );

        const [{ body: bySequenceNumber }, { body: byDigest }] = await Promise.all([
            client.getCheckpoint({ sequenceNumber: latest.sequenceNumber }),
            client.getCheckpoint({ digest: toBase58(digest!) }),
        ]);
        expect(bySequenceNumber.sequenceNumber).toBe(latest.sequenceNumber);
        expect(byDigest.sequenceNumber).toBe(latest.sequenceNumber);

        // Every checkpoint carries at least its consensus commit prologue.
        const digests = latest.transactions.map(({ transaction }) =>
            toBase58(transaction!.digest!.digest),
        );
        expect(digests.length).toBeGreaterThan(0);

        const { body: transactions } = await client.getTransactions(digests, {
            readMask: [TransactionField.TRANSACTION, TransactionField.CHECKPOINT],
        });
        for (const result of transactions) {
            expect(result.ok).toBe(true);
            if (!result.ok) continue;
            expect(result.value.checkpoint).toBe(latest.sequenceNumber);
            expect(() => decodeTransaction(result.value.transaction!)).not.toThrow();
        }
    });

    it('streams a closed range of checkpoints in order', async () => {
        const { body: latest } = await client.getCheckpoint();
        const start = latest.sequenceNumber - 5n;

        const stream = client.streamCheckpoints({
            startSequenceNumber: start,
            endSequenceNumber: start + 2n,
        });

        const sequenceNumbers: bigint[] = [];
        for await (const item of stream.items) {
            if (item.kind === 'checkpoint') sequenceNumbers.push(item.sequenceNumber);
        }

        expect(sequenceNumbers).toEqual([start, start + 1n, start + 2n]);
        expect((await stream.metadata).chainId).toBeDefined();
    });
});
