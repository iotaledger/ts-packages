// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, vi } from 'vitest';

import { GraphQLWebSocketClient } from '../../src/graphql-websocket-client.js';
import type { MockWebSocketHarness } from './mock-websocket.js';
import {
    createMockWebSocket,
    emitClose,
    emitServerMessage,
    framesOfType,
    tick,
} from './mock-websocket.js';

const QUERY = 'subscription { events { __typename ... on Event { json } } }';

function connect(
    harness: MockWebSocketHarness,
    options: {
        reconnectTimeout?: number;
        maxReconnects?: number;
        connectionAckTimeout?: number;
        startupErrorGrace?: number;
    } = {},
) {
    return new GraphQLWebSocketClient('http://localhost:9125/graphql/subscriptions', {
        WebSocketConstructor: harness.WebSocketConstructor,
        reconnectTimeout: 1,
        connectionAckTimeout: 50,
        startupErrorGrace: 1,
        ...options,
    });
}

describe('GraphQLWebSocketClient', () => {
    describe('handshake', () => {
        test('rewrites the endpoint to ws and uses the graphql-transport-ws subprotocol', async () => {
            const harness = createMockWebSocket();
            await connect(harness).subscribe({ query: QUERY, onMessage: () => {} });

            expect(harness.latest().url).toBe('ws://localhost:9125/graphql/subscriptions');
            expect(harness.latest().protocol).toBe('graphql-transport-ws');
        });

        test('sends connection_init before any subscribe frame', async () => {
            const harness = createMockWebSocket();
            await connect(harness).subscribe({ query: QUERY, onMessage: () => {} });

            expect(harness.latest().sent.map((frame) => frame.type)).toEqual([
                'connection_init',
                'subscribe',
            ]);
        });

        test('rejects when the connection is never acknowledged', async () => {
            const harness = createMockWebSocket({ ack: false });
            const client = connect(harness, { connectionAckTimeout: 5 });

            await expect(client.subscribe({ query: QUERY, onMessage: () => {} })).rejects.toThrow(
                /acknowledgement timeout/i,
            );
        });

        test('rejects when the socket closes before the acknowledgement', async () => {
            const harness = createMockWebSocket({ ack: false });
            const client = connect(harness);
            const subscribing = client.subscribe({ query: QUERY, onMessage: () => {} });

            await tick();
            emitClose(harness.latest());

            await expect(subscribing).rejects.toThrow(/closed before connection was acknowledged/i);
        });
    });

    describe('subscribe frame', () => {
        test('carries the query and variables', async () => {
            const harness = createMockWebSocket();
            await connect(harness).subscribe({
                query: QUERY,
                variables: { filter: { emittingModule: '0x3' } },
                onMessage: () => {},
            });

            expect(framesOfType(harness.latest(), 'subscribe')).toEqual([
                {
                    id: '1',
                    type: 'subscribe',
                    payload: { query: QUERY, variables: { filter: { emittingModule: '0x3' } } },
                },
            ]);
        });
    });

    describe('server frames', () => {
        test('next delivers data to onMessage', async () => {
            const harness = createMockWebSocket();
            const onMessage = vi.fn();
            await connect(harness).subscribe({ query: QUERY, onMessage });

            emitServerMessage(harness.latest(), {
                id: '1',
                type: 'next',
                payload: { data: { events: { __typename: 'Event' } } },
            });

            expect(onMessage).toHaveBeenCalledWith({ events: { __typename: 'Event' } });
        });

        test('payload errors go to onError instead of onMessage', async () => {
            const harness = createMockWebSocket();
            const onMessage = vi.fn();
            const onError = vi.fn();
            await connect(harness).subscribe({ query: QUERY, onMessage, onError });

            emitServerMessage(harness.latest(), {
                id: '1',
                type: 'next',
                payload: { errors: [{ message: 'boom' }] },
            });

            expect(onError).toHaveBeenCalledWith([{ message: 'boom' }]);
            expect(onMessage).not.toHaveBeenCalled();
        });

        test('complete calls onComplete', async () => {
            const harness = createMockWebSocket();
            const onComplete = vi.fn();
            await connect(harness).subscribe({ query: QUERY, onMessage: () => {}, onComplete });

            emitServerMessage(harness.latest(), { id: '1', type: 'complete' });

            expect(onComplete).toHaveBeenCalled();
        });

        test('ping is answered with a pong', async () => {
            const harness = createMockWebSocket();
            await connect(harness).subscribe({ query: QUERY, onMessage: () => {} });

            emitServerMessage(harness.latest(), { type: 'ping' });

            expect(framesOfType(harness.latest(), 'pong')).toHaveLength(1);
        });

        test('an error frame drops the subscription so a reconnect cannot resurrect it', async () => {
            const harness = createMockWebSocket();
            const client = connect(harness, { reconnectTimeout: 5 });
            await client.subscribe({ query: QUERY, onMessage: () => {}, onError: () => {} });
            await client.subscribe({ query: QUERY, onMessage: () => {} });

            emitServerMessage(harness.latest(), {
                id: '1',
                type: 'error',
                payload: [{ message: 'invalid filter' }],
            });

            emitClose(harness.latest());
            await tick(30);

            expect(framesOfType(harness.latest(), 'subscribe').map((frame) => frame.id)).toEqual([
                '2',
            ]);
        });
    });

    describe('startup errors', () => {
        test('a rejected operation rejects subscribe() instead of resolving', async () => {
            const harness = createMockWebSocket();
            const onError = vi.fn();
            const client = connect(harness, { startupErrorGrace: 50 });

            const subscribing = client.subscribe({ query: QUERY, onMessage: () => {}, onError });
            await tick();
            emitServerMessage(harness.latest(), {
                id: '1',
                type: 'error',
                payload: [{ message: 'unknown field emittingModule' }],
            });

            await expect(subscribing).rejects.toThrow(/unknown field emittingModule/);
            expect(onError).not.toHaveBeenCalled();
        });

        test('an error after the startup window goes to onError', async () => {
            const harness = createMockWebSocket();
            const onError = vi.fn();
            const client = connect(harness);

            await client.subscribe({ query: QUERY, onMessage: () => {}, onError });
            emitServerMessage(harness.latest(), {
                id: '1',
                type: 'error',
                payload: [{ message: 'lost downstream' }],
            });

            expect(onError).toHaveBeenCalledWith([{ message: 'lost downstream' }]);
        });
    });

    describe('unsubscribe', () => {
        test('sends a complete frame once and reports whether it did', async () => {
            const harness = createMockWebSocket();
            const unsubscribe = await connect(harness).subscribe({
                query: QUERY,
                onMessage: () => {},
            });

            await expect(unsubscribe()).resolves.toBe(true);
            await expect(unsubscribe()).resolves.toBe(false);
            expect(framesOfType(harness.latest(), 'complete')).toHaveLength(1);
        });
    });

    describe('AbortSignal', () => {
        test('aborting the signal unsubscribes', async () => {
            const harness = createMockWebSocket();
            const controller = new AbortController();
            await connect(harness).subscribe({
                query: QUERY,
                onMessage: () => {},
                signal: controller.signal,
            });

            controller.abort();
            await tick();

            expect(framesOfType(harness.latest(), 'complete')).toHaveLength(1);
        });

        test('a signal already aborted before subscribe leaves nothing live', async () => {
            const harness = createMockWebSocket();
            const controller = new AbortController();
            controller.abort();
            const onMessage = vi.fn();

            const unsubscribe = await connect(harness).subscribe({
                query: QUERY,
                onMessage,
                signal: controller.signal,
            });
            await tick();

            expect(harness.sockets).toHaveLength(0);
            expect(onMessage).not.toHaveBeenCalled();
            await expect(unsubscribe()).resolves.toBe(false);
        });
    });

    describe('reconnect', () => {
        test('resubscribes existing subscriptions on the replacement socket', async () => {
            const harness = createMockWebSocket();
            const client = connect(harness, { reconnectTimeout: 5 });
            await client.subscribe({ query: QUERY, onMessage: () => {} });

            emitClose(harness.latest());
            await tick(30);

            expect(harness.sockets).toHaveLength(2);
            expect(framesOfType(harness.latest(), 'subscribe')).toHaveLength(1);
        });

        test('does not close a socket established during the reconnect delay', async () => {
            const harness = createMockWebSocket();
            const client = connect(harness, { reconnectTimeout: 20 });
            await client.subscribe({ query: QUERY, onMessage: () => {} });

            emitClose(harness.sockets[0]);
            await client.subscribe({ query: QUERY, onMessage: () => {} });
            const replacement = harness.latest();

            await tick(50);

            expect(replacement.closeCalls).toBe(0);
        });

        test('does not reconnect after close()', async () => {
            const harness = createMockWebSocket();
            const client = connect(harness, { reconnectTimeout: 20 });
            await client.subscribe({ query: QUERY, onMessage: () => {} });

            client.close();
            await client.subscribe({ query: QUERY, onMessage: () => {} });
            const replacement = harness.latest();

            await tick(50);

            expect(replacement.closeCalls).toBe(0);
        });

        test('reports to subscribers once reconnecting has stopped', async () => {
            const harness = createMockWebSocket();
            const client = connect(harness, {
                reconnectTimeout: 1,
                connectionAckTimeout: 5,
                maxReconnects: 1,
            });
            const onError = vi.fn();
            await client.subscribe({ query: QUERY, onMessage: () => {}, onError });

            harness.setAck(false);
            emitClose(harness.sockets[0]);
            await tick(60);

            expect(onError).toHaveBeenCalled();
        });
    });
});
