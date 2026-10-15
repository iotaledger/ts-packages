// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

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

export type CoinSource = 'metadata' | 'manager';

export enum CoinsFilter {
    All = 'all',
    Recognized = 'recognized',
    NotRecognized = 'not-recognized',
}

export interface ListCoinsOptions {
    filter: CoinsFilter;
    search: string;
    offset: number;
    limit: number;
}

export interface CoinsResponse {
    coins: OnChainCoin[];
    nextOffset: number | null;
    counts: Record<CoinsFilter, number>;
}
