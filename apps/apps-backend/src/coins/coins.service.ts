// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { DEFAULT_COIN_REGISTRY, INDEXED_COIN_NETWORKS } from '@iota/core/constants/coins.constants';
import { Network } from '@iota/iota-sdk/client';

import { COIN_REGISTRY } from '../features/coins.constants';
import { fetchAllCoins } from './coins.fetcher';
import { buildCoinsIndex, listCoins } from './coins.list';
import { COINS_CACHE_TTL_MS, coinsKey } from './coins.constants';
import { CoinsIndex, CoinsResponse, ListCoinsOptions } from './coins.types';

function getCoinRegistry(network: Network) {
    // Our coin registry is currently only available on mainnet
    return network === Network.Mainnet ? COIN_REGISTRY : DEFAULT_COIN_REGISTRY;
}

@Injectable()
export class CoinsService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    @Timeout(0)
    async refreshCachedCoinsOnStartup() {
        await this.refreshCachedCoins();
    }

    @Cron(CronExpression.EVERY_2_HOURS, { waitForCompletion: true })
    async refreshCachedCoins() {
        await Promise.all(
            INDEXED_COIN_NETWORKS.map(async (network) => {
                const coins = await fetchAllCoins(network);
                const index = buildCoinsIndex(coins, getCoinRegistry(network));
                await this.cacheManager.set(coinsKey(network), index, COINS_CACHE_TTL_MS);
            }),
        );
    }

    async getCoins(network: Network, options: ListCoinsOptions): Promise<CoinsResponse | null> {
        const index = await this.cacheManager.get<CoinsIndex>(coinsKey(network));
        return index ? listCoins(index, options) : null;
    }
}
