// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
    DEFAULT_MAX_MESSAGE_SIZE_BYTES,
    GRPC_URLS,
    IotaGrpcClient,
    MAX_MESSAGE_SIZE_BYTES,
    MIN_MESSAGE_SIZE_BYTES,
    getGrpcUrl,
    isIotaGrpcClient,
} from '../../src/index.js';

describe('IotaGrpcClient', () => {
    it('defaults to the size the server chunks at', () => {
        expect(new IotaGrpcClient({ network: 'mainnet' }).maxMessageSizeBytes).toBe(
            DEFAULT_MAX_MESSAGE_SIZE_BYTES,
        );
    });

    it('rejects a message size the server would refuse', () => {
        expect(
            () =>
                new IotaGrpcClient({
                    network: 'mainnet',
                    maxMessageSizeBytes: MIN_MESSAGE_SIZE_BYTES - 1,
                }),
        ).toThrow(RangeError);

        expect(
            () =>
                new IotaGrpcClient({
                    network: 'mainnet',
                    maxMessageSizeBytes: MAX_MESSAGE_SIZE_BYTES + 1,
                }),
        ).toThrow(RangeError);
    });

    it('builds each service once and keeps it', () => {
        const client = new IotaGrpcClient({ network: 'devnet' });

        expect(client.ledger).toBe(client.ledger);
    });

    it('takes a url instead of a network', () => {
        expect(
            new IotaGrpcClient({ url: 'http://localhost:50051' }).ledger.getServiceInfo,
        ).toBeTypeOf('function');
    });

    it('is recognisable across module copies', () => {
        expect(isIotaGrpcClient(new IotaGrpcClient({ network: 'devnet' }))).toBe(true);
        expect(isIotaGrpcClient({})).toBe(false);
    });
});

describe('networks', () => {
    it('resolves the public endpoints', () => {
        expect(getGrpcUrl('mainnet')).toBe('https://grpc.mainnet.iota.cafe');
        expect(GRPC_URLS.localnet).toBe('http://localhost:50051');
    });
});
