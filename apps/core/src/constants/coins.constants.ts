// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { CoinTrust } from '../enums/coins.enums';
import { CoinRegistryEntry } from '../interfaces/coins.interfaces';

export const COINS_QUERY_REFETCH_INTERVAL = 20_000;
export const COINS_QUERY_STALE_TIME = 20_000;
export const COIN_TYPE = '0x2::coin::Coin';

export const DEFAULT_COIN_REGISTRY: CoinRegistryEntry[] = [
    {
        coinType: IOTA_TYPE_ARG,
        name: 'IOTA',
        trust: CoinTrust.Native,
        valuation: { kind: 'market', priceId: 'iota' },
    },
];
