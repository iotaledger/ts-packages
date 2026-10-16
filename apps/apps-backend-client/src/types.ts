// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export interface FeatureDefinition<T = unknown> {
    defaultValue?: T;
}

export interface FeaturesResponse {
    status: number;
    features: Record<string, FeatureDefinition>;
    dateUpdated: string;
}

export interface CoinPriceResponse {
    price: string | null;
}

export interface MonitorNetworkResponse {
    degraded: boolean;
}

export interface FeatureResult<T> {
    value: T | null;
    on: boolean;
    off: boolean;
}

export interface OnChainCoin {
    coinType: string;
    name: string;
    symbol: string;
    decimals: number;
    description: string;
    iconUrl: string | null;
    supply: string | null;
    creator: string | null;
    createdAt: number | null;
    publishDigest: string | null;
}

export type CoinsFilter = 'all' | 'recognized' | 'not-recognized';

export interface CoinsResponse {
    coins: OnChainCoin[];
    nextOffset: number | null;
    counts: Record<CoinsFilter, number>;
}

/**
 * `indexing` while apps-backend is still indexing the network's coins, and
 * `not-indexed` for networks whose coins apps-backend does not index.
 */
export type CoinsResult =
    | ({ status: 'ready' } & CoinsResponse)
    | { status: 'indexing' }
    | { status: 'not-indexed' };

export type CoinsSort = 'name' | 'createdAt';
export type CoinsSortOrder = 'asc' | 'desc';

export interface GetCoinsParams {
    network: string;
    filter: CoinsFilter;
    search?: string;
    sort?: CoinsSort;
    order?: CoinsSortOrder;
    offset?: number;
    limit?: number;
}
