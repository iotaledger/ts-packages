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
        const result = await this.#post(
            '/v1/reserve_gas',
            { gas_budget: gasBudget, reserve_duration_secs: reserveDurationSecs },
            { headers, signal },
            (data: ReserveGasResponse) => data.result,
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
        return this.#post(
            '/v1/execute_tx',
            {
                reservation_id: reservationId,
                tx_bytes: typeof transaction === 'string' ? transaction : toBase64(transaction),
                user_sig: signature,
                request_type: requestType,
            },
            { headers, signal },
            (data: ExecuteTransactionResponse) => data.effects,
        );
    }

    async getHealth({ signal }: { signal?: AbortSignal } = {}): Promise<boolean> {
        try {
            const res = await this.#fetch('/', { signal });
            return res.ok && (await res.text()) === 'OK';
        } catch (error) {
            if (signal?.aborted) {
                throw error;
            }
            return false;
        }
    }

    async getVersion({ signal }: { signal?: AbortSignal } = {}): Promise<string> {
        const res = await this.#fetch('/version', { signal });

        if (!res.ok) {
            throw new GasStationError(`Unexpected status code: ${res.status}`, res.status);
        }

        return res.text();
    }

    async #post<T extends { error?: string | null }, R>(
        path: string,
        body: object,
        { headers, signal }: GasStationRequestOptions,
        select: (data: T) => R | null | undefined,
    ): Promise<R> {
        const res = await this.#fetch(path, {
            method: 'POST',
            signal,
            headers: mergeHeaders(
                { 'Content-Type': 'application/json' },
                this.#authHeaders(),
                headers,
            ),
            body: JSON.stringify(body),
        });

        const text = await res.text();
        const data = parseJson<T>(text);

        if (data?.error) {
            throw new GasStationError(data.error, res.status);
        }

        if (!res.ok) {
            throw new GasStationError(text || `Unexpected status code: ${res.status}`, res.status);
        }

        const result = data ? select(data) : undefined;

        if (result === null || result === undefined) {
            throw new GasStationError('Invalid gas station response', res.status);
        }

        return result;
    }

    #fetch(path: string, init: RequestInit): Promise<Response> {
        const fetchFn = this.#options.fetch ?? fetch;

        return fetchFn(`${this.#url}${path}`, {
            ...init,
            headers: mergeHeaders(this.#options.headers, init.headers),
        });
    }

    #authHeaders(): HttpHeaders {
        return this.#options.authToken
            ? { Authorization: `Bearer ${this.#options.authToken}` }
            : {};
    }
}

// Header names are case-insensitive, so later sources must replace earlier ones regardless of casing.
function mergeHeaders(...sources: (HeadersInit | undefined)[]): Headers {
    const headers = new Headers();

    for (const source of sources) {
        new Headers(source).forEach((value, key) => headers.set(key, value));
    }

    return headers;
}

function parseJson<T>(text: string): T | null {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}
