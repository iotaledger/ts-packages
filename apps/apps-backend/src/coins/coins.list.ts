// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinRegistryEntry } from '@iota/core/interfaces/coins.interfaces';
import { normalizeStructTag } from '@iota/iota-sdk/utils';

import {
    CoinsFilter,
    CoinsResponse,
    CoinsSort,
    ListCoinsOptions,
    OnChainCoin,
    SortOrder,
} from './coins.types';

function byCreationDate(coin1: OnChainCoin, coin2: OnChainCoin): number {
    return (
        (coin1.createdAt ?? Number.MAX_SAFE_INTEGER) - (coin2.createdAt ?? Number.MAX_SAFE_INTEGER)
    );
}

function toCoinType(value: string): string | null {
    if (value.split('::').length < 3) return null;
    try {
        return normalizeStructTag(value);
    } catch {
        return null;
    }
}

function searchCoins(coins: OnChainCoin[], search: string): OnChainCoin[] {
    if (!search) return coins;

    const searchedCoinType = toCoinType(search);
    if (searchedCoinType) return coins.filter(({ coinType }) => coinType === searchedCoinType);

    const text = search.toLowerCase();
    return coins.filter(({ coinType, name, symbol }) =>
        [coinType, name, symbol].some((value) => value.toLowerCase().includes(text)),
    );
}

// Coins without a creation date go last in both orders.
function compareCreatedAt(coin1: OnChainCoin, coin2: OnChainCoin, order: SortOrder): number {
    if (coin1.createdAt === null || coin2.createdAt === null) {
        return Number(coin1.createdAt === null) - Number(coin2.createdAt === null);
    }
    const difference = coin1.createdAt - coin2.createdAt;
    return order === SortOrder.Asc ? difference : -difference;
}

function sortCoins(coins: OnChainCoin[], sort: CoinsSort | undefined, order: SortOrder) {
    if (!sort) return coins;
    return [...coins].sort((coin1, coin2) => {
        if (sort === CoinsSort.CreatedAt) return compareCreatedAt(coin1, coin2, order);
        const difference = coin1.name.localeCompare(coin2.name);
        return order === SortOrder.Asc ? difference : -difference;
    });
}

/**
 * Recognized coins first, in registry order, then the rest from oldest to newest.
 */
export function listCoins(
    coins: OnChainCoin[],
    registry: CoinRegistryEntry[],
    { filter, search, offset, limit, sort, order }: ListCoinsOptions,
): CoinsResponse {
    const coinsByType = new Map(coins.map((coin) => [coin.coinType, coin]));
    const recognized = registry.flatMap(({ coinType }) => {
        const coin = coinsByType.get(normalizeStructTag(coinType));
        return coin ? [coin] : [];
    });
    const recognizedTypes = new Set(recognized.map(({ coinType }) => coinType));
    const notRecognized = coins
        .filter(({ coinType }) => !recognizedTypes.has(coinType))
        .sort(byCreationDate);

    const coinsByFilter: Record<CoinsFilter, OnChainCoin[]> = {
        [CoinsFilter.All]: [...recognized, ...notRecognized],
        [CoinsFilter.Recognized]: recognized,
        [CoinsFilter.NotRecognized]: notRecognized,
    };
    const matchingCoins = sortCoins(searchCoins(coinsByFilter[filter], search), sort, order);
    const end = offset + limit;

    return {
        coins: matchingCoins.slice(offset, end),
        nextOffset: end < matchingCoins.length ? end : null,
        counts: {
            [CoinsFilter.All]: coinsByFilter[CoinsFilter.All].length,
            [CoinsFilter.Recognized]: recognized.length,
            [CoinsFilter.NotRecognized]: notRecognized.length,
        },
    };
}
