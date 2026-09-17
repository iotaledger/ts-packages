// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, test } from 'vitest';

import {
    SubscribeEventsDocument,
    SubscribeTransactionsDocument,
} from '../../src/generated/queries.js';
import { GraphQLWebSocketClient } from '../../src/graphql-websocket-client.js';

const DEFAULT_GRAPHQL_URL = import.meta.env.DEFAULT_GRAPHQL_URL ?? 'http:127.0.0.1:9125';
const SUBSCRIPTIONS_URL = DEFAULT_GRAPHQL_URL.replace(/\/?$/, '/subscriptions');

const ZERO_ADDRESS = `0x${'0'.repeat(64)}`;
const SETTLE_MS = 2_000;
const TEST_TIMEOUT = 30_000;

/**
 * The mock-socket unit tests cover the protocol; this covers the half they cannot, that the
 * generated documents and the filter values the mappers produce are ones the deployed schema
 * accepts. A rejected subscription answers with an `error` frame rather than failing the
 * handshake, so the assertion is on `onError` and not on `subscribe` throwing.
 */
describe('subscription documents against the deployed schema', () => {
    let client: GraphQLWebSocketClient | null = null;

    afterEach(() => {
        client?.close();
        client = null;
    });

    test.each([
        ['subscribeEvents, unfiltered', SubscribeEventsDocument.toString(), undefined],
        [
            'subscribeEvents, emittingModule filter',
            SubscribeEventsDocument.toString(),
            { filter: { emittingModule: '0x3::iota_system' } },
        ],
        ['subscribeTransactions, unfiltered', SubscribeTransactionsDocument.toString(), undefined],
        [
            'subscribeTransactions, kind filter',
            SubscribeTransactionsDocument.toString(),
            { filter: { kind: 'PROGRAMMABLE_TX' } },
        ],
        [
            'subscribeTransactions, signingAddress filter',
            SubscribeTransactionsDocument.toString(),
            { filter: { signingAddress: ZERO_ADDRESS } },
        ],
    ])(
        '%s is accepted',
        async (_name, query, variables) => {
            client = new GraphQLWebSocketClient(SUBSCRIPTIONS_URL);

            const errors: Array<{ message: string }[]> = [];
            const unsubscribe = await client.subscribe({
                query,
                variables,
                onMessage: () => {},
                onError: (received) => errors.push(received),
            });

            await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
            await unsubscribe();

            expect(errors).toEqual([]);
        },
        TEST_TIMEOUT,
    );
});
