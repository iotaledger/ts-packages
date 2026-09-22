// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import type { GrpcNetwork } from '../../src/index.js';
import { IotaGrpcClient } from '../../src/index.js';

/**
 * Run against every public network, not just one: they run different node
 * versions, so this is what tells us the minimum a method needs.
 */
const NETWORKS: GrpcNetwork[] = ['mainnet', 'testnet', 'devnet'];

describe.each(NETWORKS)('%s', (network) => {
    it('answers getServiceInfo', async () => {
        const client = new IotaGrpcClient({ network });

        const info = await client.ledger.getServiceInfo({
            readMask: { paths: ['chain', 'epoch', 'server'] },
        });

        console.log(
            `${network.padEnd(8)} ${info.server}  epoch ${info.epoch}  chain ${info.chain}`,
        );

        expect(info.server).toMatch(/^iota-node\//);
        expect(info.epoch).toBeGreaterThan(0n);
    });
});
