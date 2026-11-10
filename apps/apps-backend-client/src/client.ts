// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type {
    CoinPriceResponse,
    CoinsResult,
    FeatureDefinition,
    FeaturesResponse,
    GetCoinsParams,
    MonitorNetworkResponse,
} from './types';
import { isVersionAtLeast } from './version';

export class AppsBackendClient {
    private features: Record<string, FeatureDefinition> = {};
    private attributes: Record<string, unknown> = {};
    private listeners: Set<() => void> = new Set();
    private snapshot: Record<string, FeatureDefinition> = this.features;

    constructor(url?: string) {
        if (url) {
            this.attributes.url = url;
        }
    }

    private get url(): string {
        return (this.attributes.url as string) ?? '';
    }

    async init(): Promise<void> {
        await this.refreshFeatures();
    }

    async refreshFeatures(): Promise<void> {
        try {
            const res = await fetch(`${this.url}/api/features`);
            if (!res.ok) {
                throw new Error('Failed to fetch features');
            }
            const data: FeaturesResponse = await res.json();
            this.features = data.features;
            this.updateSnapshot();
        } catch (error) {
            console.error(error);
        }
    }

    getFeatureValue<T>(key: string, defaultValue: T): T {
        const feature = this.snapshot[key];
        if (feature && feature.defaultValue !== undefined) {
            return feature.defaultValue as T;
        }
        return defaultValue;
    }

    getFeatures(): Record<string, FeatureDefinition> {
        return this.features;
    }

    setAttributes(attrs: Record<string, unknown>): void {
        this.attributes = { ...this.attributes, ...attrs };
        if ('version' in attrs) {
            this.updateSnapshot();
        }
    }

    getAttributes(): Record<string, unknown> {
        return this.attributes;
    }

    async setPayload(payload: { features: Record<string, FeatureDefinition> }): Promise<void> {
        this.features = payload.features;
        this.updateSnapshot();
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    getSnapshot(): Record<string, FeatureDefinition> {
        return this.snapshot;
    }

    async getCoinPrice(coin: string): Promise<CoinPriceResponse> {
        return this.request(`coin-price/${coin}`);
    }

    async getMonitorNetwork(project: string): Promise<MonitorNetworkResponse> {
        return this.request('monitor-network', { project });
    }

    async checkRestricted(): Promise<boolean> {
        const res = await fetch(`${this.url}/api/restricted/`, {
            method: 'POST',
            headers: { accept: '', 'content-type': 'application/json' },
            body: JSON.stringify({}),
        });
        return res.status === 403;
    }

    async request<T>(
        path: string,
        queryParams?: Record<string, string>,
        options?: RequestInit,
    ): Promise<T> {
        const res = await this.fetchPath(path, queryParams, options);
        if (!res.ok) {
            throw new Error('Unexpected response');
        }
        return res.json();
    }

    async getCoins({
        network,
        filter,
        search = '',
        sort,
        order = 'asc',
        offset = 0,
        limit = 20,
    }: GetCoinsParams): Promise<CoinsResult> {
        const response = await this.fetchPath('coins', {
            network,
            filter,
            search,
            ...(sort ? { sort, order } : {}),
            offset: String(offset),
            limit: String(limit),
        });
        if (response.status === 404) {
            return { status: 'not-indexed' };
        }
        if (response.status === 503) {
            return { status: 'indexing' };
        }
        if (!response.ok) {
            throw new Error('Unexpected response');
        }
        return { status: 'ready', ...(await response.json()) };
    }

    private fetchPath(
        path: string,
        queryParams?: Record<string, string>,
        options?: RequestInit,
    ): Promise<Response> {
        const base = `${this.url}/${path}`;
        const url =
            queryParams && Object.keys(queryParams).length > 0
                ? `${base}?${new URLSearchParams(queryParams)}`
                : base;
        return fetch(url, options);
    }

    private updateSnapshot(): void {
        const version = this.attributes.version;

        this.snapshot = Object.fromEntries(
            Object.entries(this.features).filter(
                ([, feature]) =>
                    !feature.minVersion ||
                    typeof version !== 'string' ||
                    isVersionAtLeast(version, feature.minVersion),
            ),
        );
        this.listeners.forEach((listener) => listener());
    }
}
