// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { OnChainCoin } from '~/hooks';

export type CoinLabels = Pick<OnChainCoin, 'coinType' | 'name' | 'symbol'>;

function isSameLabel(value1: string, value2: string): boolean {
    return value1.trim().toLowerCase() === value2.trim().toLowerCase();
}

/**
 * The recognized coin with the same name or symbol as this coin, if any.
 * Returns null for recognized coins themselves.
 */
export function findMatchingRecognizedCoin<Coin extends CoinLabels>(
    coin: CoinLabels,
    recognizedCoins: Coin[],
): Coin | null {
    if (recognizedCoins.some(({ coinType }) => coinType === coin.coinType)) return null;

    return (
        recognizedCoins.find(
            ({ name, symbol }) => isSameLabel(name, coin.name) || isSameLabel(symbol, coin.symbol),
        ) ?? null
    );
}
