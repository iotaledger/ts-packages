// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IotaHTTPTransport } from '../../../src/client';

describe('IotaHTTPTransport', () => {
    describe('rpc requests', () => {
        const mockResult = { data: 123 };
        let requestId = 0;

        const fetch = vi.fn(() => {
            requestId += 1;
            return Promise.resolve(
                new Response(
                    new TextEncoder().encode(
                        JSON.stringify({
                            jsonrpc: '2.0',
                            result: mockResult,
                            id: requestId,
                        }),
                    ),
                    {
                        status: 200,
                    },
                ),
            );
        });

        const transport = new IotaHTTPTransport({
            url: 'http://localhost:4000',
            rpc: {
                url: 'http://localhost:4000',
            },
            fetch,
        });

        beforeEach(() => {
            fetch.mockClear();
        });

        it('should make a request', async () => {
            const result = await transport.request({
                method: 'getAllBalances',
                params: ['0x1234'],
            });

            expect(fetch).toHaveBeenCalledTimes(1);

            expect(fetch).toHaveBeenCalledWith('http://localhost:4000', {
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: requestId,
                    method: 'getAllBalances',
                    params: ['0x1234'],
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'Client-Sdk-Type': 'typescript',
                },
                method: 'POST',
            });

            expect(result).toEqual(mockResult);
        });

        it('should call inspector when provided', async () => {
            const mockInspector = vi.fn(async (input, executeRequest) => {
                expect(input.method).toBe('getAllBalances');
                expect(input.params).toEqual(['0x1234']);
                const result = await executeRequest();
                return result;
            });

            const transport = new IotaHTTPTransport({
                url: 'http://localhost:4000',
                rpc: {
                    url: 'http://localhost:4000',
                },
                fetch,
                inspector: mockInspector,
            });

            const result = await transport.request({
                method: 'getAllBalances',
                params: ['0x1234'],
            });

            expect(mockInspector).toHaveBeenCalledTimes(1);
            expect(mockInspector).toHaveBeenCalledWith(
                {
                    method: 'getAllBalances',
                    params: ['0x1234'],
                },
                expect.any(Function),
            );

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should handle inspector errors', async () => {
            const mockInspector = vi.fn(async () => {
                throw new Error('Inspector error');
            });

            const transport = new IotaHTTPTransport({
                url: 'http://localhost:4000',
                rpc: {
                    url: 'http://localhost:4000',
                },
                fetch,
                inspector: mockInspector,
            });

            await expect(
                transport.request({
                    method: 'getAllBalances',
                    params: ['0x1234'],
                }),
            ).rejects.toThrow('Inspector error');

            expect(mockInspector).toHaveBeenCalledTimes(1);
            expect(fetch).toHaveBeenCalledTimes(0); // Request should not be made if inspector fails
        });
    });

    describe('rpc subscriptions', () => {
        it('Rejects subscriptions, which JSON-RPC does not serve', async () => {
            const transport = new IotaHTTPTransport({ url: 'http://localhost:4000' });

            await expect(
                transport.subscribe({
                    method: 'iotax_subscribeEvent',
                    unsubscribe: 'iotax_unsubscribeEvent',
                    params: [],
                    onMessage: () => {},
                }),
            ).rejects.toThrow('not available over JSON-RPC');
        });
    });
});
