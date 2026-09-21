// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { IotaGrpcClient } from '../../src/index.js';

describe('LedgerService', () => {
    it('returns service info from mainnet', async () => {
        const client = new IotaGrpcClient({ network: 'mainnet' });

        const info = await client.ledger.getServiceInfo({
            readMask: { paths: ['chain', 'epoch', 'server'] },
        });

        console.log(info.chain, info.epoch, info.server);

        expect(info.chain).toBe('mainnet');
        expect(info.epoch).toBeGreaterThan(0n);
    });
});
