// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import type { GrpcNetwork } from '../../src/index.js';
import { parseResponseMetadata } from '../../src/metadata.js';
import { ServiceInfoField, toReadMask } from '../../src/read-masks.js';
import { IotaGrpcTestClient } from '../test-client.js';

const NETWORKS: GrpcNetwork[] = ['mainnet', 'testnet', 'devnet'];

describe.each(NETWORKS)('%s', (network) => {
    const client = new IotaGrpcTestClient({ network });

    /** The headers describe the same snapshot as the body, so they must agree exactly. */
    it('agrees with the GetServiceInfo body', async () => {
        let headers: Headers | undefined;
        const info = await client.ledger.getServiceInfo(
            {
                readMask: toReadMask(
                    [
                        ServiceInfoField.CHAIN,
                        ServiceInfoField.EPOCH,
                        ServiceInfoField.EXECUTED_CHECKPOINT_HEIGHT,
                        ServiceInfoField.EXECUTED_CHECKPOINT_TIMESTAMP,
                        ServiceInfoField.LOWEST_AVAILABLE_CHECKPOINT,
                        ServiceInfoField.LOWEST_AVAILABLE_CHECKPOINT_OBJECTS,
                        ServiceInfoField.SERVER,
                    ],
                    [],
                ),
            },
            { onHeader: (h) => (headers = h) },
        );

        expect(headers).toBeDefined();
        const metadata = parseResponseMetadata(headers!);

        expect(metadata.chain).toBe(info.chain);
        expect(metadata.epoch).toBe(info.epoch);
        expect(metadata.checkpointHeight).toBe(info.executedCheckpointHeight);
        expect(metadata.lowestAvailableCheckpoint).toBe(info.lowestAvailableCheckpoint);
        expect(metadata.lowestAvailableCheckpointObjects).toBe(
            info.lowestAvailableCheckpointObjects,
        );
        expect(metadata.serverVersion).toBe(info.server);
        expect(metadata.timestampMs! / 1000n).toBe(info.executedCheckpointTimestamp?.seconds);
    });

    it('carries a well-formed envelope', async () => {
        let headers: Headers | undefined;
        await client.ledger.getServiceInfo({}, { onHeader: (h) => (headers = h) });
        const metadata = parseResponseMetadata(headers!);

        expect(metadata.chainId).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
        expect(metadata.serverVersion).toMatch(/^iota-node\//);
        expect(metadata.lowestAvailableCheckpoint!).toBeLessThanOrEqual(metadata.checkpointHeight!);
        expect(metadata.lowestAvailableCheckpointObjects!).toBeLessThanOrEqual(
            metadata.checkpointHeight!,
        );
        expect(new Date(metadata.timestamp!).getTime()).toBe(Number(metadata.timestampMs));
    });

    it('arrives on server streams too', async () => {
        let headers: Headers | undefined;
        for await (const frame of client.ledger.getCheckpoint(
            { checkpointId: { case: 'latest', value: true } },
            { onHeader: (h) => (headers = h) },
        )) {
            void frame;
        }

        const metadata = parseResponseMetadata(headers!);
        expect(metadata.epoch).toBeGreaterThan(0n);
        expect(metadata.checkpointHeight).toBeGreaterThan(0n);
    });
});
