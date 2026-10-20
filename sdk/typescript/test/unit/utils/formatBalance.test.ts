// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from 'vitest';

import { CoinFormat, formatAmount, formatBalance } from '../../../src/utils/formatBalance';

describe('formatBalance', () => {
    describe('CoinFormat.Full', () => {
        test.each([
            [1_234_567_890n, 6, '1,234.56789'],
            ['1000000000', 9, '1'],
            [123456789, 0, '123,456,789'],
            [1, 9, '0.000000001'],
            [0, 9, '0'],
        ])('formatBalance(%s, %s) -> %s', (balance, decimals, expected) => {
            expect(formatBalance(balance, decimals, CoinFormat.Full)).toBe(expected);
        });

        test('omits group separators when useGroupSeparator is false', () => {
            expect(
                formatBalance(1_234_567_890n, 6, CoinFormat.Full, false, {
                    useGroupSeparator: false,
                }),
            ).toBe('1234.56789');
        });
    });

    describe('CoinFormat.TruncatedDecimals', () => {
        test.each([
            ['1999000000', 9, '1.99'],
            ['1234567890123', 9, '1,234.56'],
            ['123456789000000000', 9, '123,456,789'],
            ['1500000000', 9, '1.5'],
            ['5000000', 9, '0'],
            ['1999', 3, '1.99'],
            ['42', 0, '42'],
        ])('formatBalance(%s, %s) -> %s', (balance, decimals, expected) => {
            expect(formatBalance(balance, decimals, CoinFormat.TruncatedDecimals)).toBe(expected);
        });

        test('omits group separators when useGroupSeparator is false', () => {
            expect(
                formatBalance('1234567890123', 9, CoinFormat.TruncatedDecimals, false, {
                    useGroupSeparator: false,
                }),
            ).toBe('1234.56');
        });
    });

    describe('CoinFormat.Rounded', () => {
        test.each([
            ['0', 9, '0'],
            ['1500000000', 9, '1.5'],
            ['1999000000', 9, '1.99'],
            ['500000000', 9, '0.5'],
            ['10000', 9, '0.0₄1'],
            ['12345000000000', 9, '12.34 K'],
            ['2500000000000000', 9, '2.5 M'],
            ['3000000000000000000', 9, '3 B'],
        ])('formatBalance(%s, %s) -> %s', (balance, decimals, expected) => {
            expect(formatBalance(balance, decimals)).toBe(expected);
            expect(formatBalance(balance, decimals, CoinFormat.Rounded)).toBe(expected);
        });
    });

    describe('showSign', () => {
        test.each([
            ['5000000000', CoinFormat.Full, '+5'],
            ['-5000000000', CoinFormat.Full, '-5'],
            ['5000000000', CoinFormat.TruncatedDecimals, '+5'],
            ['-5000000000', CoinFormat.TruncatedDecimals, '-5'],
            ['5000000000', CoinFormat.Rounded, '+5'],
            ['-5000000000', CoinFormat.Rounded, '-5'],
            ['0', CoinFormat.Full, '+0'],
        ])('formatBalance(%s, 9, %s, true) -> %s', (balance, format, expected) => {
            expect(formatBalance(balance, 9, format, true)).toBe(expected);
        });

        test('shows a positive sign when a negative value truncates to zero', () => {
            expect(formatBalance('-5000000', 9, CoinFormat.TruncatedDecimals, true)).toBe('+0');
        });
    });

    describe('input types', () => {
        test.each([[1_500_000_000n], [1_500_000_000], ['1500000000']])('accepts %s', (balance) => {
            expect(formatBalance(balance, 9, CoinFormat.Full)).toBe('1.5');
        });

        test.each([
            [0, '1,500,000,000'],
            [6, '1,500'],
            [9, '1.5'],
        ])('applies decimals=%s', (decimals, expected) => {
            expect(formatBalance(1_500_000_000n, decimals, CoinFormat.Full)).toBe(expected);
        });
    });
});

describe('formatAmount', () => {
    test.each([
        [undefined, '--'],
        [null, '--'],
        [0, '0'],
        [9999, '9,999'],
        [10_000, '10 K'],
        [-12_345, '-12.34 K'],
        [1_000_000, '1 M'],
        [1_000_000_000n, '1 B'],
        ['0.00001', '0.0₄1'],
    ])('formatAmount(%s) -> %s', (amount, expected) => {
        expect(formatAmount(amount)).toBe(expected);
    });
});
