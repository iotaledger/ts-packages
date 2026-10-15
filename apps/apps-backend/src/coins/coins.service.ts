// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';
import { DEFAULT_COIN_REGISTRY, INDEXED_COIN_NETWORKS } from '@iota/core/constants/coins.constants';
import { Network } from '@iota/iota-sdk/client';

import { COIN_REGISTRY } from '../features/coins.constants';
import { fetchAllCoins } from './coins.fetcher';
import { buildCoinsIndex, listCoins } from './coins.list';
import { COINS_RETRY_INTERVAL_MS } from './coins.constants';
import { CoinsIndex, CoinsResponse, ListCoinsOptions } from './coins.types';

function getCoinRegistry(network: Network) {
    // Our coin registry is currently only available on mainnet
    return network === Network.Mainnet ? COIN_REGISTRY : DEFAULT_COIN_REGISTRY;
}

@Injectable()
export class CoinsService {
    private readonly logger = new Logger(CoinsService.name);
    // Kept in memory rather than in the cache manager, which copies values on every
    // read: a request would otherwise deserialize every list just to return one page.
    // A failed refresh keeps the previous index.
    private readonly indexes = new Map<Network, CoinsIndex>();
    private readonly refreshingNetworks = new Set<Network>();
    private readonly failedNetworks = new Set<Network>();

    @Timeout(0)
    async refreshCachedCoinsOnStartup() {
        await this.refreshCachedCoins();
    }

    @Cron(CronExpression.EVERY_2_HOURS)
    async refreshCachedCoins() {
        await Promise.all(INDEXED_COIN_NETWORKS.map((network) => this.refreshNetwork(network)));
    }

    // Networks without an index would otherwise wait for the next scheduled refresh.
    @Interval(COINS_RETRY_INTERVAL_MS)
    async retryMissingIndexes() {
        await Promise.all(
            INDEXED_COIN_NETWORKS.filter((network) => !this.indexes.has(network)).map((network) =>
                this.refreshNetwork(network),
            ),
        );
    }

    getCoins(network: Network, options: ListCoinsOptions): CoinsResponse | null {
        const index = this.indexes.get(network);
        return index ? listCoins(index, options) : null;
    }

    /**
     * Whether the last attempt to index the network failed and no other attempt is running.
     */
    hasIndexingFailed(network: Network): boolean {
        return this.failedNetworks.has(network);
    }

    private async refreshNetwork(network: Network) {
        if (this.refreshingNetworks.has(network)) return;
        this.refreshingNetworks.add(network);
        this.failedNetworks.delete(network);
        try {
            const coins = await fetchAllCoins(network);
            this.indexes.set(network, buildCoinsIndex(coins, getCoinRegistry(network)));
        } catch (error) {
            this.failedNetworks.add(network);
            this.logger.error(`Failed to index the coins of ${network}`, error);
        } finally {
            this.refreshingNetworks.delete(network);
        }
    }
}
