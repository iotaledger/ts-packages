// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinTrust } from '../../enums';
import { getCoinRegistryEntry } from './getCoinRegistryEntry';

export function isRecognizedCoin(coinType: string): boolean {
    const coinRegistryEntry = getCoinRegistryEntry(coinType);
    return coinRegistryEntry ? coinRegistryEntry.trust === CoinTrust.Recognized : false;
}
