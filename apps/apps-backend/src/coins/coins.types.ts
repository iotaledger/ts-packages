// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { CoinsResponse, OnChainCoin } from '@iota/apps-backend-client/types';

export type { CoinsResponse, OnChainCoin };

export type CoinSource = 'metadata' | 'manager';

export enum CoinsFilter {
    All = 'all',
    Recognized = 'recognized',
    NotRecognized = 'not-recognized',
}

export enum CoinsSort {
    Name = 'name',
    CreatedAt = 'createdAt',
}

export enum CoinsSortOrder {
    Asc = 'asc',
    Desc = 'desc',
}

/**
 * The coins of a network in every order the endpoint offers, built once per refresh.
 * Lists are keyed by filter and then by order (see `orderKey`).
 */
export interface CoinsIndex {
    lists: Record<CoinsFilter, Record<string, OnChainCoin[]>>;
    searchTextByType: Map<string, string>;
    counts: Record<CoinsFilter, number>;
}

export interface ListCoinsOptions {
    filter: CoinsFilter;
    search: string;
    sort?: CoinsSort;
    order: CoinsSortOrder;
    offset: number;
    limit: number;
}
