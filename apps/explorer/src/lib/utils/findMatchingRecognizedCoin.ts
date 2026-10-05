// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { OnChainCoin } from '~/hooks';

type CoinLabels = Pick<OnChainCoin, 'coinType' | 'name' | 'symbol'>;

function isSameLabel(value1: string, value2: string): boolean {
    return value1.trim().toLowerCase() === value2.trim().toLowerCase();
}

/**
 * The recognized coin with the same name or symbol as this coin, if any.
 * Returns null for recognized coins themselves.
 */
export function findMatchingRecognizedCoin(
    coin: CoinLabels,
    recognizedCoins: OnChainCoin[],
): OnChainCoin | null {
    if (recognizedCoins.some(({ coinType }) => coinType === coin.coinType)) return null;

    return (
        recognizedCoins.find(
            ({ name, symbol }) => isSameLabel(name, coin.name) || isSameLabel(symbol, coin.symbol),
        ) ?? null
    );
}
