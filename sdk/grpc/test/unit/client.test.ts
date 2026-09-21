// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
    DEFAULT_MAX_MESSAGE_SIZE_BYTES,
    IotaGrpcClient,
    MAX_MESSAGE_SIZE_BYTES,
    MIN_MESSAGE_SIZE_BYTES,
    NETWORKS,
} from '../../src/index.js';

describe('IotaGrpcClient', () => {
    it('defaults to mainnet and the server chunk size', () => {
        const client = new IotaGrpcClient();

        expect(client.maxMessageSizeBytes).toBe(DEFAULT_MAX_MESSAGE_SIZE_BYTES);
        expect(NETWORKS.mainnet).toBe('https://grpc.mainnet.iota.cafe');
    });

    it('rejects a message size the server would refuse', () => {
        expect(
            () => new IotaGrpcClient({ maxMessageSizeBytes: MIN_MESSAGE_SIZE_BYTES - 1 }),
        ).toThrow(RangeError);
        expect(
            () => new IotaGrpcClient({ maxMessageSizeBytes: MAX_MESSAGE_SIZE_BYTES + 1 }),
        ).toThrow(RangeError);
    });

    it('exposes the ledger service', () => {
        expect(new IotaGrpcClient({ network: 'devnet' }).ledger.getServiceInfo).toBeTypeOf(
            'function',
        );
    });
});
