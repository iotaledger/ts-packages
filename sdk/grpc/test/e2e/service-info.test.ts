// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { createIotaGrpcClient, createNodeTransport } from '../../src/index.js';

describe('LedgerService', () => {
    it('responde a getServiceInfo contra mainnet', async () => {
        const client = createIotaGrpcClient(
            createNodeTransport({ baseUrl: 'https://grpc.mainnet.iota.cafe' }),
        );

        const info = await client.ledger.getServiceInfo({
            readMask: { paths: ['chain', 'epoch', 'server'] },
        });

        console.log(info.chain, info.epoch, info.server);
        expect(info.chain).toBe('mainnet');
        expect(info.epoch).toBeGreaterThan(0n);
    });
});
