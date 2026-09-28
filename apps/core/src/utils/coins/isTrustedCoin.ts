// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinTrust } from '../../enums';
import { CoinRegistryEntry } from '../../interfaces';
import { getCoinRegistryEntry } from './getCoinRegistryEntry';

export function isTrustedCoin(registry: CoinRegistryEntry[], coinType: string): boolean {
    const trust = getCoinRegistryEntry(registry, coinType)?.trust;
    return trust === CoinTrust.Native || trust === CoinTrust.Recognized;
}
