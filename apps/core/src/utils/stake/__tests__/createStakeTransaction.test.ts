// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import type { CoinStruct } from '@iota/iota-sdk/client';
import { createStakeTransaction } from '../createStakeTransaction';

const VALIDATOR = `0x${'a'.repeat(64)}`;

function makeCoin(index: number, balance: bigint): CoinStruct {
    return {
        coinObjectId: `0x${(index + 1).toString(16).padStart(64, '0')}`,
        coinType: '0x2::iota::IOTA',
        balance: balance.toString(),
        version: '1',
        digest: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
        previousTransaction: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
    };
}

describe('createStakeTransaction', () => {
    it('pays gas with the first coin and merges the rest in batches of maxArguments - 1', () => {
        const coins = Array.from({ length: 10 }, (_, i) => makeCoin(i, 1_000n));
        const data = createStakeTransaction(10_000n, VALIDATOR, {
            coins,
            maxArguments: 4,
        }).getData();

        expect(data.gasData.payment).toHaveLength(1);
        expect(data.gasData.payment?.[0].objectId).toBe(coins[0].coinObjectId);
        const merges = data.commands.filter((c) => c.$kind === 'MergeCoins');
        expect(merges.map((c) => c.MergeCoins.sources.length)).toEqual([3, 3, 3]);
    });
});
