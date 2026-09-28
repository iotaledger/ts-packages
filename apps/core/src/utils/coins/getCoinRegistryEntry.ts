// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { normalizeStructTag } from '@iota/iota-sdk/utils';
import { CoinRegistryEntry } from '../../interfaces';

function normalizeCoinType(coinType: string): string | null {
    try {
        return normalizeStructTag(coinType);
    } catch {
        return null;
    }
}

export function getCoinRegistryEntry(
    registry: CoinRegistryEntry[],
    coinType: string,
): CoinRegistryEntry | undefined {
    const normalized = normalizeCoinType(coinType);
    if (!normalized) return undefined;
    return registry.find((entry) => normalizeCoinType(entry.coinType) === normalized);
}
