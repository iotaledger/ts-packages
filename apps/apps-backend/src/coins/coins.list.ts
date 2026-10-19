// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinRegistryEntry } from '@iota/core/interfaces/coins.interfaces';
import { normalizeStructTag } from '@iota/iota-sdk/utils';

import {
    CoinsFilter,
    CoinsIndex,
    CoinsResponse,
    CoinsSort,
    CoinsSortOrder,
    ListCoinsOptions,
    OnChainCoin,
} from './coins.types';

const DEFAULT_ORDER = 'default';

function orderKey(sort: CoinsSort | undefined, order: CoinsSortOrder): string {
    return sort ? `${sort}-${order}` : DEFAULT_ORDER;
}

// Coins without a creation date go last in both orders.
function compareCreatedAt(coin1: OnChainCoin, coin2: OnChainCoin, order: CoinsSortOrder): number {
    if (coin1.createdAt === null || coin2.createdAt === null) {
        return Number(coin1.createdAt === null) - Number(coin2.createdAt === null);
    }
    const difference = coin1.createdAt - coin2.createdAt;
    return order === CoinsSortOrder.Asc ? difference : -difference;
}

function sortCoins(coins: OnChainCoin[], sort: CoinsSort, order: CoinsSortOrder): OnChainCoin[] {
    return [...coins].sort((coin1, coin2) => {
        if (sort === CoinsSort.CreatedAt) return compareCreatedAt(coin1, coin2, order);
        const difference = coin1.name.localeCompare(coin2.name);
        return order === CoinsSortOrder.Asc ? difference : -difference;
    });
}

function orderedLists(
    coins: OnChainCoin[],
    defaultOrder: OnChainCoin[],
): Record<string, OnChainCoin[]> {
    const lists: Record<string, OnChainCoin[]> = { [DEFAULT_ORDER]: defaultOrder };
    for (const sort of Object.values(CoinsSort)) {
        for (const order of Object.values(CoinsSortOrder)) {
            lists[orderKey(sort, order)] = sortCoins(coins, sort, order);
        }
    }
    return lists;
}

function toCoinType(value: string): string | null {
    if (value.split('::').length < 3) return null;
    try {
        return normalizeStructTag(value);
    } catch {
        return null;
    }
}

function searchCoins(
    coins: OnChainCoin[],
    search: string,
    searchTextByType: Map<string, string>,
): OnChainCoin[] {
    if (!search) return coins;

    const searchedCoinType = toCoinType(search);
    if (searchedCoinType) return coins.filter(({ coinType }) => coinType === searchedCoinType);

    const text = search.toLowerCase();
    return coins.filter(({ coinType }) => searchTextByType.get(coinType)?.includes(text));
}

/**
 * Orders the coins once per refresh, so a request only searches and slices.
 * Recognized coins stay on top in every order: by default in registry order,
 * then the rest from oldest to newest.
 */
export function buildCoinsIndex(coins: OnChainCoin[], registry: CoinRegistryEntry[]): CoinsIndex {
    const coinsByType = new Map(coins.map((coin) => [coin.coinType, coin]));
    const recognized = registry.flatMap(({ coinType }) => {
        const coin = coinsByType.get(normalizeStructTag(coinType));
        return coin ? [coin] : [];
    });
    const recognizedTypes = new Set(recognized.map(({ coinType }) => coinType));
    const notRecognized = coins.filter(({ coinType }) => !recognizedTypes.has(coinType));

    const recognizedLists = orderedLists(recognized, recognized);
    const notRecognizedLists = orderedLists(
        notRecognized,
        sortCoins(notRecognized, CoinsSort.CreatedAt, CoinsSortOrder.Asc),
    );
    const allLists = Object.fromEntries(
        Object.keys(recognizedLists).map((key) => [
            key,
            [...recognizedLists[key], ...notRecognizedLists[key]],
        ]),
    );

    // Lowercased once here so a search does not lowercase every coin on each request.
    const searchTextByType = new Map(
        coins.map(({ coinType, name, symbol }) => [
            coinType,
            [coinType, name, symbol].join('\n').toLowerCase(),
        ]),
    );

    return {
        searchTextByType,
        lists: {
            [CoinsFilter.All]: allLists,
            [CoinsFilter.Recognized]: recognizedLists,
            [CoinsFilter.NotRecognized]: notRecognizedLists,
        },
        counts: {
            [CoinsFilter.All]: coins.length,
            [CoinsFilter.Recognized]: recognized.length,
            [CoinsFilter.NotRecognized]: notRecognized.length,
        },
    };
}

function countCoins(index: CoinsIndex, search: string): Record<CoinsFilter, number> {
    if (!search) return index.counts;

    const count = (filter: CoinsFilter) =>
        searchCoins(index.lists[filter][DEFAULT_ORDER], search, index.searchTextByType).length;
    const all = count(CoinsFilter.All);
    const recognized = count(CoinsFilter.Recognized);

    return {
        [CoinsFilter.All]: all,
        [CoinsFilter.Recognized]: recognized,
        [CoinsFilter.NotRecognized]: all - recognized,
    };
}

export function listCoins(
    index: CoinsIndex,
    { filter, search, sort, order, offset, limit }: ListCoinsOptions,
): CoinsResponse {
    const matchingCoins = searchCoins(
        index.lists[filter][orderKey(sort, order)],
        search,
        index.searchTextByType,
    );
    const end = offset + limit;

    return {
        coins: matchingCoins.slice(offset, end),
        nextOffset: end < matchingCoins.length ? end : null,
        counts: countCoins(index, search),
    };
}
