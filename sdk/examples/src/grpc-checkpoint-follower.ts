// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { setTimeout as sleep } from 'node:timers/promises';
import type { GrpcNetwork } from '@iota/grpc';
import { CheckpointResponseField, GRPC_URLS, IotaGrpcClient } from '@iota/grpc';

/**
 * Example: Checkpoint Follower
 *
 * This example follows a network over gRPC, printing each checkpoint as the
 * network produces it. When the stream drops, it starts a new one after the
 * last checkpoint it received, so none are skipped. Press Ctrl+C to stop.
 *
 * It follows the network given as its first argument (mainnet, testnet, devnet
 * or localnet), or testnet without one. It starts at the latest checkpoint, or
 * at the sequence number given as its second argument:
 *
 *   pnpm example ./src/grpc-checkpoint-follower.ts
 *   pnpm example ./src/grpc-checkpoint-follower.ts mainnet
 *   pnpm example ./src/grpc-checkpoint-follower.ts testnet 274000000
 */

// Give up after this many failures in a row without receiving a checkpoint.
const MAX_FAILURES = 5;

// Read the network from the first argument, defaulting to testnet
const network = process.argv[2] || 'testnet';
if (!Object.hasOwn(GRPC_URLS, network)) {
    throw new Error(
        `Unknown network '${network}': use one of ${Object.keys(GRPC_URLS).join(', ')}`,
    );
}

// Create a client connected to that network
const client = new IotaGrpcClient({ network: network as GrpcNetwork });

// Stop on Ctrl+C
const controller = new AbortController();
process.on('SIGINT', () => controller.abort());

// The next checkpoint to ask for. Undefined asks for the latest.
let next = process.argv[3] === undefined ? undefined : BigInt(process.argv[3]);
let failures = 0;

console.log(`Following ${network} from ${next ?? 'the latest checkpoint'}...`);

while (!controller.signal.aborted) {
    try {
        const stream = client.streamCheckpoints({
            startSequenceNumber: next,
            // By default only the summary is sent: ask for the transaction digests too
            readMask: [
                CheckpointResponseField.CHECKPOINT_SUMMARY,
                CheckpointResponseField.TRANSACTIONS_TRANSACTION_DIGEST,
            ],
            signal: controller.signal,
        });

        for await (const item of stream.items) {
            if (item.kind !== 'checkpoint') {
                continue;
            }

            console.log(
                `Checkpoint ${item.sequenceNumber}: ${item.transactions.length} transactions`,
            );
            next = item.sequenceNumber + 1n;
            failures = 0;
        }
    } catch (error) {
        // Ctrl+C ends the stream with a CANCELED error
        if (controller.signal.aborted) {
            break;
        }

        failures++;
        if (failures > MAX_FAILURES) {
            throw error;
        }

        // Wait 1, 2, 4, 8 and 16 seconds between attempts
        const delayMs = 1_000 * 2 ** (failures - 1);
        console.warn(`Stream dropped: ${(error as Error).message}`);
        console.warn(`Resuming at ${next ?? 'the latest checkpoint'} in ${delayMs / 1_000}s...`);
        await sleep(delayMs, undefined, { signal: controller.signal }).catch(() => {});
    }
}

console.log('Stopped.');
