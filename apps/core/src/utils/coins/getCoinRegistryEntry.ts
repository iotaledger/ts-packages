// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { normalizeStructTag } from '@iota/iota-sdk/utils';
import { COIN_REGISTRY } from '../../constants';
import { CoinRegistryEntry } from '../../interfaces';

const REGISTRY_BY_TYPE = new Map<string, CoinRegistryEntry>(
    COIN_REGISTRY.map((entry) => [normalizeStructTag(entry.coinType), entry]),
);

function normalizeCoinType(coinType: string): string | null {
    try {
        return normalizeStructTag(coinType);
    } catch {
        return null;
    }
}

export function getCoinRegistryEntry(coinType: string): CoinRegistryEntry | undefined {
    const normalized = normalizeCoinType(coinType);
    return normalized ? REGISTRY_BY_TYPE.get(normalized) : undefined;
}
