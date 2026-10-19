// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export interface FeatureDefinition<T = unknown> {
    defaultValue?: T;
    // `x.y.z` or `x.y.z.n` where n is the RC version
    minVersion?: string;
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
