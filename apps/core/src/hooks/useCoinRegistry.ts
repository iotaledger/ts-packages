// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useFeatureValue } from '@iota/apps-backend-client';
import { Network } from '@iota/iota-sdk/client';
import { useNetwork } from './useNetwork';
import { Feature } from '../enums';
import { DEFAULT_COIN_REGISTRY } from '../constants';
import { CoinRegistryEntry } from '../interfaces';
import { getCoinRegistryEntry } from '../utils';

export function useCoinRegistry(): CoinRegistryEntry[] {
    const network = useNetwork();
    const coinRegistry = useFeatureValue(Feature.CoinRegistry, DEFAULT_COIN_REGISTRY);

    // Our coin registry is currently only available on mainnet
    return network === Network.Mainnet ? coinRegistry : DEFAULT_COIN_REGISTRY;
}

export function useCoinRegistryEntry(coinType: string): CoinRegistryEntry | undefined {
    const coinRegistry = useCoinRegistry();
    return getCoinRegistryEntry(coinRegistry, coinType);
}
