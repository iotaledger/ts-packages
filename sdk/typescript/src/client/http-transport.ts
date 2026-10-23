// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { JsonRpcError, IotaHTTPStatusError } from './errors.js';

/**
 * An object defining headers to be passed to the RPC server
 */
export type HttpHeaders = { [header: string]: string };

/**
 * A function that can inspect and modify RPC requests before they are executed.
 * Useful for monitoring, tracing, and error handling.
 */
export type RequestInspector = <T>(
    input: IotaTransportRequestOptions,
    executeRequest: () => Promise<T>,
) => Promise<T>;

export interface IotaHTTPTransportOptions {
    fetch?: typeof fetch;
    /**
     * @deprecated Ignored: full nodes do not serve JSON-RPC over WebSocket. Use
     * `IotaClientGraphQLTransport` from `@iota/graphql-transport` to subscribe.
     */
    WebSocketConstructor?: typeof WebSocket;
    url: string;
    rpc?: {
        headers?: HttpHeaders;
        url?: string;
    };
    /**
     * @deprecated Ignored: full nodes do not serve JSON-RPC over WebSocket. Use
     * `IotaClientGraphQLTransport` from `@iota/graphql-transport` to subscribe.
     */
    websocket?: {
        url?: string;
        WebSocketConstructor?: typeof WebSocket;
        callTimeout?: number;
        reconnectTimeout?: number;
        maxReconnects?: number;
    };
    inspector?: RequestInspector;
}

export interface IotaTransportRequestOptions {
    method: string;
    params: unknown[];
    signal?: AbortSignal;
}

// oxlint-disable-next-line @typescript-eslint/ban-types

export interface IotaTransportSubscribeOptions<T> {
    method: string;
    unsubscribe: string;
    params: unknown[];
    onMessage: (event: T) => void;
    /**
     * Called when the subscription ends without the caller unsubscribing. No further messages
     * arrive after it, so a caller that wants to keep receiving must subscribe again.
     */
    onError?: (error: Error) => void;
    signal?: AbortSignal;
    startAfter?: string;
}

export interface IotaTransport {
    request<T = unknown>(input: IotaTransportRequestOptions): Promise<T>;
    subscribe<T = unknown>(
        input: IotaTransportSubscribeOptions<T>,
    ): Promise<() => Promise<boolean>>;
}

export class IotaHTTPTransport implements IotaTransport {
    #requestId = 0;
    #options: IotaHTTPTransportOptions;

    constructor(options: IotaHTTPTransportOptions) {
        this.#options = options;
    }

    fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
        const fetchFn = this.#options.fetch ?? fetch;

        if (!fetchFn) {
            throw new Error(
                'The current environment does not support fetch, you can provide a fetch implementation in the options for IotaHTTPTransport.',
            );
        }

        return fetchFn(input, init);
    }

    async request<T>(input: IotaTransportRequestOptions): Promise<T> {
        this.#requestId += 1;

        const executeRequest = async () => {
            const res = await this.fetch(this.#options.rpc?.url ?? this.#options.url, {
                method: 'POST',
                signal: input.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Client-Sdk-Type': 'typescript',
                    ...this.#options.rpc?.headers,
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: this.#requestId,
                    method: input.method,
                    params: input.params,
                }),
            });

            if (!res.ok) {
                throw new IotaHTTPStatusError(
                    `Unexpected status code: ${res.status}`,
                    res.status,
                    res.statusText,
                );
            }

            const data = await res.json();

            if ('error' in data && data.error != null) {
                throw new JsonRpcError(data.error.message, data.error.code);
            }

            return data.result;
        };

        return this.#options.inspector
            ? this.#options.inspector(input, executeRequest)
            : executeRequest();
    }

    async subscribe<T>(input: IotaTransportSubscribeOptions<T>): Promise<() => Promise<boolean>> {
        throw new Error(
            `${input.method} is not available over JSON-RPC. Use IotaClientGraphQLTransport from @iota/graphql-transport to subscribe.`,
        );
    }
}
