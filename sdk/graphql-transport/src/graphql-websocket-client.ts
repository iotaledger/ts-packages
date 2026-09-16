// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { GraphQLDocument } from '@iota/iota-sdk/graphql';
import { print } from 'graphql';

interface ConnectionInitMessage {
    type: 'connection_init';
    payload?: Record<string, unknown>;
}

interface ConnectionAckMessage {
    type: 'connection_ack';
    payload?: Record<string, unknown>;
}

interface SubscribeMessage {
    id: string;
    type: 'subscribe';
    payload: {
        query: string;
        variables?: Record<string, unknown>;
        operationName?: string;
        extensions?: Record<string, unknown>;
    };
}

interface NextMessage {
    id: string;
    type: 'next';
    payload: {
        data?: unknown;
        errors?: Array<{ message: string }>;
    };
}

interface ErrorMessage {
    id: string;
    type: 'error';
    payload: Array<{ message: string }>;
}

interface CompleteMessage {
    id: string;
    type: 'complete';
}

interface PingMessage {
    type: 'ping';
    payload?: Record<string, unknown>;
}

interface PongMessage {
    type: 'pong';
    payload?: Record<string, unknown>;
}

type ServerMessage =
    | ConnectionAckMessage
    | NextMessage
    | ErrorMessage
    | CompleteMessage
    | PingMessage;

/** The socket or handshake failed, as opposed to the server refusing one operation. */
export class GraphQLWebSocketConnectionError extends Error {}

export type GraphQLSubscriptionVariables = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GraphQLSubscriptionRequest<T = any> = {
    query: GraphQLDocument;
    /** Resolved on every send, so a resubscribe can carry a resume cursor. */
    variables?: GraphQLSubscriptionVariables | (() => GraphQLSubscriptionVariables | undefined);
    onMessage: (data: T) => void;
    onError?: (errors: Array<{ message: string }>) => void;
    onComplete?: () => void;
    signal?: AbortSignal;
};

/**
 * Configuration options for the GraphQL WebSocket client.
 */
export type GraphQLWebSocketClientOptions = {
    /**
     * Custom WebSocket class to use.
     * Defaults to the global WebSocket class, if available.
     */
    WebSocketConstructor?: typeof WebSocket;
    /**
     * Optional payload to send with the `connection_init` message.
     * Can be used for authentication tokens or other connection-level metadata.
     */
    connectionParams?: Record<string, unknown> | undefined;
    /**
     * Milliseconds to wait for the `connection_ack` message before timing out.
     * @default 30000
     */
    connectionAckTimeout?: number;
    /**
     * Milliseconds between reconnection attempts.
     * @default 3000
     */
    reconnectTimeout?: number;
    /**
     * Maximum number of reconnection attempts before giving up.
     * @default 5
     */
    maxReconnects?: number;
    /**
     * Milliseconds to wait for the server to refuse the operation. graphql-ws does not
     * acknowledge a `subscribe`, so an `error` frame is the only signal. Inside this window it
     * rejects `subscribe()`, after it it goes to `onError`. Messages arrive throughout.
     * @default 250
     */
    startupErrorGrace?: number;
};

type ResolvedGraphQLWebSocketClientOptions = {
    WebSocketConstructor: typeof WebSocket;
    connectionParams: Record<string, unknown> | undefined;
    connectionAckTimeout: number;
    reconnectTimeout: number;
    maxReconnects: number;
    startupErrorGrace: number;
};

const DEFAULT_OPTIONS: ResolvedGraphQLWebSocketClientOptions = {
    WebSocketConstructor: (typeof WebSocket !== 'undefined'
        ? WebSocket
        : undefined) as typeof WebSocket,
    connectionParams: undefined,
    connectionAckTimeout: 30_000,
    reconnectTimeout: 3_000,
    maxReconnects: 5,
    startupErrorGrace: 250,
};

/** Codegen's string-mode documents stringify themselves; only a real AST needs printing. */
function toQueryString(query: GraphQLDocument): string {
    if (typeof query === 'string') {
        return query;
    }

    return 'kind' in query ? print(query) : String(query);
}

function toWebSocketUrl(httpUrl: string): string {
    const url = new URL(httpUrl);
    url.protocol = url.protocol.replace('http', 'ws');
    return url.toString();
}

export class GraphQLWebSocketClient {
    #endpoint: string;
    #options: ResolvedGraphQLWebSocketClientOptions;
    #subscriptionId = 0;
    #disconnects = 0;
    #webSocket: WebSocket | null = null;
    #connectionPromise: Promise<WebSocket> | null = null;
    #subscriptions = new Map<string, GraphQLSubscription>();

    constructor(endpoint: string, options: GraphQLWebSocketClientOptions = {}) {
        this.#options = { ...DEFAULT_OPTIONS, ...options };

        if (!this.#options.WebSocketConstructor) {
            throw new GraphQLWebSocketConnectionError(
                'Missing WebSocket constructor. Provide a WebSocketConstructor option or ensure the global WebSocket is available.',
            );
        }

        this.#endpoint = endpoint.startsWith('ws') ? endpoint : toWebSocketUrl(endpoint);
    }

    async subscribe<T>(request: GraphQLSubscriptionRequest<T>): Promise<() => Promise<boolean>> {
        if (request.signal?.aborted) {
            return async () => false;
        }

        const subscription = new GraphQLSubscription(request);
        const id = this.#nextId();
        this.#subscriptions.set(id, subscription);

        try {
            await subscription.subscribe(this, id);
        } catch (e) {
            this.#subscriptions.delete(id);
            throw e;
        }

        const startupError = await subscription.settleStartup(this.#options.startupErrorGrace);

        if (startupError) {
            this.#subscriptions.delete(id);
            throw new Error(
                `GraphQL subscription was rejected: ${startupError
                    .map((error) => error.message)
                    .join(', ')}`,
            );
        }

        const cleanup = async () => {
            const result = await subscription.unsubscribe(this, id);
            this.#subscriptions.delete(id);
            return result;
        };

        // A listener added to an already-aborted signal never runs, and the handshake
        // above is awaited.
        if (request.signal?.aborted) {
            await cleanup();
            return async () => false;
        }

        request.signal?.addEventListener('abort', cleanup, { once: true });

        return cleanup;
    }

    async send(
        message: ConnectionInitMessage | SubscribeMessage | CompleteMessage | PongMessage,
    ): Promise<WebSocket> {
        const ws = await this.#setupWebSocket();
        ws.send(JSON.stringify(message));
        return ws;
    }

    close(): void {
        for (const subscription of this.#subscriptions.values()) {
            subscription.onComplete();
        }
        this.#subscriptions.clear();
        this.#webSocket?.close();
        this.#webSocket = null;
        this.#connectionPromise = null;
        this.#disconnects = 0;
    }

    #nextId(): string {
        this.#subscriptionId += 1;
        return String(this.#subscriptionId);
    }

    #setupWebSocket(): Promise<WebSocket> {
        if (this.#connectionPromise) {
            return this.#connectionPromise;
        }

        this.#connectionPromise = new Promise<WebSocket>((resolve, reject) => {
            const ws = new this.#options.WebSocketConstructor(
                this.#endpoint,
                'graphql-transport-ws',
            );
            this.#webSocket = ws;

            // Timeout for the connection_ack
            const ackTimeout = setTimeout(() => {
                ws.close();
                reject(new GraphQLWebSocketConnectionError('Connection acknowledgement timeout'));
            }, this.#options.connectionAckTimeout);

            let acknowledged = false;

            ws.addEventListener('open', () => {
                const initMessage: ConnectionInitMessage = {
                    type: 'connection_init',
                    ...(this.#options.connectionParams
                        ? { payload: this.#options.connectionParams }
                        : {}),
                };
                ws.send(JSON.stringify(initMessage));
            });

            ws.addEventListener('message', ({ data }: { data: string }) => {
                let message: ServerMessage;
                try {
                    message = JSON.parse(data) as ServerMessage;
                } catch (error) {
                    console.error(
                        new Error(`Failed to parse GraphQL WebSocket message: ${data}`, {
                            cause: error,
                        }),
                    );
                    return;
                }

                switch (message.type) {
                    case 'connection_ack':
                        clearTimeout(ackTimeout);
                        acknowledged = true;
                        this.#disconnects = 0;
                        resolve(ws);
                        break;

                    case 'next':
                        this.#subscriptions.get(message.id)?.onMessage(message.payload);
                        break;

                    case 'error':
                        this.#subscriptions.get(message.id)?.onError(message.payload);
                        this.#subscriptions.delete(message.id);
                        break;

                    case 'complete':
                        this.#subscriptions.get(message.id)?.onComplete();
                        this.#subscriptions.delete(message.id);
                        break;

                    case 'ping':
                        // Respond to server keep-alive
                        ws.send(JSON.stringify({ type: 'pong' } satisfies PongMessage));
                        break;
                }
            });

            ws.addEventListener('close', () => {
                if (this.#webSocket !== ws) {
                    return;
                }

                this.#connectionPromise = null;
                this.#webSocket = null;

                if (!acknowledged) {
                    clearTimeout(ackTimeout);
                    reject(
                        new GraphQLWebSocketConnectionError(
                            'WebSocket closed before connection was acknowledged',
                        ),
                    );
                }

                this.#scheduleReconnect();
            });

            ws.addEventListener('error', () => {
                if (!acknowledged) {
                    clearTimeout(ackTimeout);
                    reject(new GraphQLWebSocketConnectionError('WebSocket connection error'));
                }
            });
        });

        return this.#connectionPromise;
    }

    #scheduleReconnect(): void {
        const live = [...this.#subscriptions.values()].filter(
            (subscription) => subscription.isActive,
        );

        if (live.length === 0) {
            return;
        }

        this.#disconnects++;

        if (this.#disconnects > this.#options.maxReconnects) {
            for (const subscription of live) {
                subscription.onError([{ message: 'WebSocket connection lost' }]);
            }
            this.#subscriptions.clear();
            return;
        }

        setTimeout(() => {
            this.#reconnect();
        }, this.#options.reconnectTimeout);
    }

    async #reconnect(): Promise<void> {
        // A subscribe() during the reconnect delay is already live on the new socket.
        // A duplicate id makes graphql-transport-ws close the connection with 4409.
        const entries = [...this.#subscriptions.entries()].filter(
            ([, subscription]) => subscription.socket !== this.#webSocket,
        );

        await Promise.allSettled(
            entries.map(([id, subscription]) => subscription.subscribe(this, id)),
        );
    }
}

class GraphQLSubscription {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #request: GraphQLSubscriptionRequest<any>;
    #active = false;
    #socket: WebSocket | null = null;
    #startingUp = true;
    #startupError: Array<{ message: string }> | null = null;

    constructor(request: GraphQLSubscriptionRequest) {
        this.#request = request;
    }

    get isActive(): boolean {
        return this.#active;
    }

    /** The socket this operation's `subscribe` frame was last sent on. */
    get socket(): WebSocket | null {
        return this.#socket;
    }

    async subscribe(client: GraphQLWebSocketClient, id: string): Promise<void> {
        const variables =
            typeof this.#request.variables === 'function'
                ? this.#request.variables()
                : this.#request.variables;

        this.#socket = await client.send({
            id,
            type: 'subscribe',
            payload: {
                query: toQueryString(this.#request.query),
                ...(variables ? { variables } : {}),
            },
        });
        this.#active = true;
    }

    async unsubscribe(client: GraphQLWebSocketClient, id: string): Promise<boolean> {
        if (!this.#active) return false;
        this.#active = false;
        try {
            await client.send({ id, type: 'complete' });
            return true;
        } catch {
            return false;
        }
    }

    onMessage(payload: NextMessage['payload']): void {
        if (!this.#active) return;

        if (payload.errors && payload.errors.length > 0) {
            this.#request.onError?.(payload.errors);
            return;
        }

        if (payload.data != null) {
            this.#request.onMessage(payload.data);
        }
    }

    /** Closes the startup window and reports an error the server sent inside it, if any. */
    async settleStartup(grace: number): Promise<Array<{ message: string }> | null> {
        await new Promise((resolve) => setTimeout(resolve, grace));
        this.#startingUp = false;
        return this.#startupError;
    }

    onError(errors: ErrorMessage['payload']): void {
        this.#active = false;

        if (this.#startingUp) {
            this.#startupError = errors;
            return;
        }

        this.#request.onError?.(errors);
    }

    onComplete(): void {
        this.#active = false;
        this.#request.onComplete?.();
    }
}
