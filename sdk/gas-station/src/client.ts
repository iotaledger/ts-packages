// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { HttpHeaders, TransactionEffects } from '@iota/iota-sdk/client';
import { toBase64 } from '@iota/iota-sdk/utils';

import { GasStationError } from './errors.js';
import type {
    ExecuteTransactionParams,
    ExecuteTransactionResponse,
    GasStationClientOptions,
    GasStationRequestOptions,
    ReserveGasParams,
    ReserveGasResponse,
    ReserveGasResult,
} from './types.js';

export class GasStationClient {
    #url: string;
    #options: GasStationClientOptions;

    constructor(options: GasStationClientOptions) {
        this.#url = options.url.replace(/\/+$/, '');
        this.#options = options;
    }

    async reserveGas({
        gasBudget,
        reserveDurationSecs,
        headers,
        signal,
    }: ReserveGasParams): Promise<ReserveGasResult> {
        const { result } = await this.#post<ReserveGasResponse>(
            '/v1/reserve_gas',
            { gas_budget: gasBudget, reserve_duration_secs: reserveDurationSecs },
            { headers, signal },
        );

        return {
            sponsorAddress: result.sponsor_address,
            reservationId: result.reservation_id,
            gasCoins: result.gas_coins,
        };
    }

    async executeTransaction({
        reservationId,
        transaction,
        signature,
        requestType,
        headers,
        signal,
    }: ExecuteTransactionParams): Promise<TransactionEffects> {
        const { effects } = await this.#post<ExecuteTransactionResponse>(
            '/v1/execute_tx',
            {
                reservation_id: reservationId,
                tx_bytes: typeof transaction === 'string' ? transaction : toBase64(transaction),
                user_sig: signature,
                request_type: requestType,
            },
            { headers, signal },
        );

        return effects;
    }

    async getHealth({ signal }: { signal?: AbortSignal } = {}): Promise<boolean> {
        const res = await this.#fetch('/', { signal });
        return res.ok && (await res.text()) === 'OK';
    }

    async getVersion({ signal }: { signal?: AbortSignal } = {}): Promise<string> {
        const res = await this.#fetch('/version', { signal });

        if (!res.ok) {
            throw new GasStationError(`Unexpected status code: ${res.status}`, res.status);
        }

        return res.text();
    }

    async #post<T extends { error?: string | null }>(
        path: string,
        body: object,
        { headers, signal }: GasStationRequestOptions,
    ): Promise<T> {
        const res = await this.#fetch(path, {
            method: 'POST',
            signal,
            headers: {
                'Content-Type': 'application/json',
                ...this.#authHeaders(),
                ...headers,
            },
            body: JSON.stringify(body),
        });

        const data: T | null = await res.json().catch(() => null);

        if (!res.ok || !data || data.error) {
            throw new GasStationError(
                data?.error ?? `Unexpected status code: ${res.status}`,
                res.status,
            );
        }

        return data;
    }

    #fetch(path: string, init: RequestInit): Promise<Response> {
        const fetchFn = this.#options.fetch ?? fetch;

        return fetchFn(`${this.#url}${path}`, {
            ...init,
            headers: { ...this.#options.headers, ...init.headers },
        });
    }

    #authHeaders(): HttpHeaders {
        return this.#options.authToken
            ? { Authorization: `Bearer ${this.#options.authToken}` }
            : {};
    }
}
