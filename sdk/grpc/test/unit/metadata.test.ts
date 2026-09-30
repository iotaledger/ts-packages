// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { parseResponseMetadata } from '../../src/metadata.js';

/** Captured from grpc.mainnet.iota.cafe. */
const MAINNET_HEADERS = {
    'x-iota-chain': 'mainnet',
    'x-iota-chain-id': '7gzPnGnmjqvpmF7NXTCmtacXLqx1cMaJFV6GCmi1peqr',
    'x-iota-checkpoint-height': '195531582',
    'x-iota-epoch': '508',
    'x-iota-lowest-available-checkpoint': '156250529',
    'x-iota-lowest-available-checkpoint-objects': '156250530',
    'x-iota-server': 'iota-node/1.32.1-de85b83edc93',
    'x-iota-timestamp': '2026-09-25T11:03:35.080Z',
    'x-iota-timestamp-ms': '1790334215080',
};

const U64_MAX = '18446744073709551615';

describe('parseResponseMetadata', () => {
    it('reads every x-iota header', () => {
        expect(parseResponseMetadata(new Headers(MAINNET_HEADERS))).toEqual({
            chain: 'mainnet',
            chainId: '7gzPnGnmjqvpmF7NXTCmtacXLqx1cMaJFV6GCmi1peqr',
            checkpointHeight: 195531582n,
            epoch: 508n,
            lowestAvailableCheckpoint: 156250529n,
            lowestAvailableCheckpointObjects: 156250530n,
            serverVersion: 'iota-node/1.32.1-de85b83edc93',
            timestamp: '2026-09-25T11:03:35.080Z',
            timestampMs: 1790334215080n,
        });
    });

    it('leaves every field undefined when no header is present', () => {
        expect(parseResponseMetadata(new Headers())).toEqual({});
    });

    it('leaves a missing header undefined and still reads the rest', () => {
        const headers = new Headers(MAINNET_HEADERS);
        headers.delete('x-iota-epoch');

        const metadata = parseResponseMetadata(headers);

        expect(metadata.epoch).toBeUndefined();
        expect(metadata.checkpointHeight).toBe(195531582n);
    });

    it('ignores headers outside the x-iota set', () => {
        const metadata = parseResponseMetadata(
            new Headers({ 'content-type': 'application/grpc', 'x-iota-epoch': '1' }),
        );
        expect(metadata).toEqual({ epoch: 1n });
    });

    it('matches header names case-insensitively', () => {
        expect(parseResponseMetadata(new Headers({ 'X-IOTA-EPOCH': '7' })).epoch).toBe(7n);
    });

    describe('numeric headers parse as u64', () => {
        it.each([
            ['0', 0n],
            ['508', 508n],
            [U64_MAX, 18446744073709551615n],
        ])('accepts %s', (value, expected) => {
            expect(parseResponseMetadata(new Headers({ 'x-iota-epoch': value })).epoch).toBe(
                expected,
            );
        });

        it.each([
            ['empty', ''],
            ['non-numeric', 'abc'],
            ['negative', '-1'],
            ['decimal', '1.5'],
            ['exponent', '1e3'],
            ['hex', '0x10'],
            ['binary', '0b1'],
            ['above u64', '18446744073709551616'],
        ])('rejects %s without throwing', (_, value) => {
            expect(
                parseResponseMetadata(new Headers({ 'x-iota-epoch': value })).epoch,
            ).toBeUndefined();
        });

        it.each([
            ['x-iota-checkpoint-height', 'checkpointHeight'],
            ['x-iota-lowest-available-checkpoint', 'lowestAvailableCheckpoint'],
            ['x-iota-lowest-available-checkpoint-objects', 'lowestAvailableCheckpointObjects'],
            ['x-iota-timestamp-ms', 'timestampMs'],
        ] as const)('applies to %s', (header, field) => {
            expect(parseResponseMetadata(new Headers({ [header]: 'abc' }))[field]).toBeUndefined();
            expect(parseResponseMetadata(new Headers({ [header]: '42' }))[field]).toBe(42n);
        });
    });

    it('rejects a chain id that is not a base58 digest', () => {
        for (const value of ['not-base58-0OIl', '1111']) {
            expect(
                parseResponseMetadata(new Headers({ 'x-iota-chain-id': value })).chainId,
            ).toBeUndefined();
        }
    });
});
