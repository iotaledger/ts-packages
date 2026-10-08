// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { CoinStruct } from '@iota/iota-sdk/client';

export function selectCoinsForAmount(coins: CoinStruct[], target: bigint): CoinStruct[] {
    const sorted = [...coins].sort((a, b) => {
        const balanceA = BigInt(a.balance);
        const balanceB = BigInt(b.balance);
        if (balanceA === balanceB) return 0;
        return balanceA > balanceB ? -1 : 1;
    });

    const selected: CoinStruct[] = [];
    let accumulated = 0n;
    for (const coin of sorted) {
        selected.push(coin);
        accumulated += BigInt(coin.balance);
        if (accumulated >= target) {
            return selected;
        }
    }
    return sorted;
}
