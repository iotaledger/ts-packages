// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, vi } from 'vitest';

import { IotaClientGraphQLTransport } from '../../src/transport.js';
import { createMockWebSocket, emitServerMessage, framesOfType } from './mock-websocket.js';

function createTransport() {
    const harness = createMockWebSocket();
    const transport = new IotaClientGraphQLTransport({
        url: 'http://localhost:9125/graphql',
        WebSocketConstructor: harness.WebSocketConstructor,
        wsOptions: { startupErrorGrace: 1 },
    });
    return { harness, transport };
}

function subscribeFrame(harness: ReturnType<typeof createMockWebSocket>) {
    const [frame] = framesOfType(harness.latest(), 'subscribe');
    return frame.payload as { query: string; variables?: Record<string, unknown> };
}

describe('IotaClientGraphQLTransport subscriptions', () => {
    test('derives the subscriptions endpoint from the GraphQL url', async () => {
        const { harness, transport } = createTransport();
        await transport.subscribe({
            method: 'iotax_subscribeEvent',
            unsubscribe: 'iotax_unsubscribeEvent',
            params: [{}],
            onMessage: () => {},
        });

        expect(harness.latest().url).toBe('ws://localhost:9125/graphql/subscriptions');
        transport.close();
    });

    test('a Lagged frame does not reach onMessage', async () => {
        const { harness, transport } = createTransport();
        const onMessage = vi.fn();
        await transport.subscribe({
            method: 'iotax_subscribeEvent',
            unsubscribe: 'iotax_unsubscribeEvent',
            params: [{}],
            onMessage,
        });

        emitServerMessage(harness.latest(), {
            id: '1',
            type: 'next',
            payload: { data: { events: { __typename: 'Lagged', count: 5 } } },
        });

        expect(onMessage).not.toHaveBeenCalled();
        transport.close();
    });

    test('an Event frame is mapped and delivered', async () => {
        const { harness, transport } = createTransport();
        const onMessage = vi.fn();
        await transport.subscribe({
            method: 'iotax_subscribeEvent',
            unsubscribe: 'iotax_unsubscribeEvent',
            params: [{}],
            onMessage,
        });

        emitServerMessage(harness.latest(), {
            id: '1',
            type: 'next',
            payload: {
                data: {
                    events: {
                        __typename: 'Event',
                        json: { amount: '1' },
                        bcs: 'AA==',
                        timestamp: '2026-09-15T00:00:00.000Z',
                        sender: { address: '0xabc' },
                        sendingModule: { name: 'coin', package: { address: '0x2' } },
                        type: { repr: '0x2::coin::Event' },
                    },
                },
            },
        });

        expect(onMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                packageId: '0x2',
                parsedJson: { amount: '1' },
                sender: '0xabc',
                transactionModule: '0x2::coin',
                type: '0x2::coin::Event',
            }),
        );
        transport.close();
    });

    test('maps the RPC MoveModule event filter to emittingModule', async () => {
        const { harness, transport } = createTransport();
        await transport.subscribe({
            method: 'iotax_subscribeEvent',
            unsubscribe: 'iotax_unsubscribeEvent',
            params: [{ MoveModule: { package: '0x2', module: 'coin' } }],
            onMessage: () => {},
        });

        expect(subscribeFrame(harness).variables).toEqual({
            filter: { emittingModule: '0x2::coin' },
        });
        transport.close();
    });

    test('maps the RPC TransactionKind filter to the GraphQL enum', async () => {
        const { harness, transport } = createTransport();
        await transport.subscribe({
            method: 'iotax_subscribeTransaction',
            unsubscribe: 'iotax_unsubscribeTransaction',
            params: [{ TransactionKind: 'ProgrammableTransaction' }],
            onMessage: () => {},
        });

        expect(subscribeFrame(harness).variables).toEqual({
            filter: { kind: 'PROGRAMMABLE_TX' },
        });
        transport.close();
    });

    test('requests the effects bcs and nothing else for transactions', async () => {
        const { harness, transport } = createTransport();
        await transport.subscribe({
            method: 'iotax_subscribeTransaction',
            unsubscribe: 'iotax_unsubscribeTransaction',
            params: [{}],
            onMessage: () => {},
        });

        const { query, variables } = subscribeFrame(harness);
        expect(query).toContain('effects {');
        expect(query).not.toContain('@include');
        expect(variables).toEqual({ filter: undefined });
        transport.close();
    });

    test('a transaction without effects is not delivered', async () => {
        const { harness, transport } = createTransport();
        const onMessage = vi.fn();
        await transport.subscribe({
            method: 'iotax_subscribeTransaction',
            unsubscribe: 'iotax_unsubscribeTransaction',
            params: [{}],
            onMessage,
        });

        emitServerMessage(harness.latest(), {
            id: '1',
            type: 'next',
            payload: { data: { transactions: { __typename: 'TransactionBlock', effects: null } } },
        });

        expect(onMessage).not.toHaveBeenCalled();
        transport.close();
    });

    test.each([
        ['Sender', { Sender: '0xabc' }],
        ['Transaction', { Transaction: 'digest' }],
        ['MoveEventType', { MoveEventType: '0x2::coin::Event' }],
    ])('rejects the %s event filter rather than dropping it', async (_name, filter) => {
        const { transport } = createTransport();

        await expect(
            transport.subscribe({
                method: 'iotax_subscribeEvent',
                unsubscribe: 'iotax_unsubscribeEvent',
                params: [filter],
                onMessage: () => {},
            }),
        ).rejects.toThrow(/not supported/i);
        transport.close();
    });

    test.each([
        ['Checkpoint', { Checkpoint: '1' }],
        ['ToAddress', { ToAddress: '0xabc' }],
        ['TransactionKindIn', { TransactionKindIn: ['ProgrammableTransaction'] }],
        ['an unmappable TransactionKind', { TransactionKind: 'TransactionDenyRulesUpdate' }],
        ['MoveFunction without a module', { MoveFunction: { package: '0x2', function: 'mint' } }],
    ])('rejects the %s transaction filter rather than dropping it', async (_name, filter) => {
        const { transport } = createTransport();

        await expect(
            transport.subscribe({
                method: 'iotax_subscribeTransaction',
                unsubscribe: 'iotax_unsubscribeTransaction',
                params: [filter],
                onMessage: () => {},
            }),
        ).rejects.toThrow(/not supported/i);
        transport.close();
    });

    test('an empty filter object still means no filter', async () => {
        const { harness, transport } = createTransport();
        await transport.subscribe({
            method: 'iotax_subscribeEvent',
            unsubscribe: 'iotax_unsubscribeEvent',
            params: [{}],
            onMessage: () => {},
        });

        expect(subscribeFrame(harness).variables).toEqual({ filter: undefined });
        transport.close();
    });

    test('an unmapped subscribe method falls back to the JSON-RPC transport', async () => {
        const { transport } = createTransport();

        await expect(
            transport.subscribe({
                method: 'iotax_subscribeSomethingElse',
                unsubscribe: 'iotax_unsubscribeSomethingElse',
                params: [],
                onMessage: () => {},
            }),
        ).rejects.toThrow();
        transport.close();
    });
});
