// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { DEFAULT_COIN_REGISTRY } from '@iota/core/constants/coins.constants';
import { Network } from '@iota/iota-sdk/client';

import { COIN_REGISTRY } from '../features/coins.constants';
import { fetchAllCoins } from './coins.fetcher';
import { listCoins } from './coins.list';
import { COINS_CACHE_TTL_MS, coinsKey, INDEXED_NETWORKS } from './coins.constants';
import { CoinsResponse, ListCoinsOptions, OnChainCoin } from './coins.types';

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
            INDEXED_NETWORKS.map(async (network) => {
                const coins = await fetchAllCoins(network);
                await this.cacheManager.set(coinsKey(network), coins, COINS_CACHE_TTL_MS);
            }),
        );
    }

    async getCoins(network: Network, options: ListCoinsOptions): Promise<CoinsResponse | null> {
        const coins = await this.cacheManager.get<OnChainCoin[]>(coinsKey(network));
        if (!coins) return null;
        // Our coin registry is currently only available on mainnet
        const registry = network === Network.Mainnet ? COIN_REGISTRY : DEFAULT_COIN_REGISTRY;
        return listCoins(coins, registry, options);
    }
}
