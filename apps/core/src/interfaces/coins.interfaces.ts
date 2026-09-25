// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinTrust } from '../enums';
import { CoinValuation } from '../types/coins';

export interface CoinRegistryEntry {
    coinType: string;
    name?: string;
    trust: CoinTrust;
    valuation?: CoinValuation;
}
