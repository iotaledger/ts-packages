// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Network } from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { CoinTrust } from '../enums/coins.enums';
import { CoinRegistryEntry } from '../interfaces/coins.interfaces';

export const COINS_QUERY_REFETCH_INTERVAL = 20_000;
export const COINS_QUERY_STALE_TIME = 20_000;
export const COIN_TYPE = '0x2::coin::Coin';

/**
 * The networks whose coins apps-backend indexes. The coin list is not available on any other network.
 */
export const INDEXED_COIN_NETWORKS: Network[] = [Network.Mainnet, Network.Testnet, Network.Devnet];

export function isIndexedCoinNetwork(network: string): network is Network {
    return INDEXED_COIN_NETWORKS.some((indexed) => indexed === network);
}

export const DEFAULT_COIN_REGISTRY: CoinRegistryEntry[] = [
    {
        coinType: IOTA_TYPE_ARG,
        name: 'IOTA',
        trust: CoinTrust.Native,
        valuation: { kind: 'market', priceId: 'iota' },
    },
];
