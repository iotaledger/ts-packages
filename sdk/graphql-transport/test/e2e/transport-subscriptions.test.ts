// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, describe, expect, test } from 'vitest';

import { Transaction } from '../../../typescript/src/transactions/index.js';
import { setup, TestToolbox } from '../../../typescript/test/e2e/utils/setup';
import { IotaClientGraphQLTransport } from '../../src/transport.js';

const DEFAULT_GRAPHQL_URL = import.meta.env.DEFAULT_GRAPHQL_URL ?? 'http:127.0.0.1:9125';
const LOCALNET_INDEXER = 'http:127.0.0.1:9124';

const DELIVERY_TIMEOUT = 30_000;
const TEST_TIMEOUT = 60_000;

async function transfer(toolbox: TestToolbox): Promise<string> {
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [1]);
    tx.transferObjects([coin], toolbox.address());
    const { digest } = await toolbox.client.signAndExecuteTransaction({
        transaction: tx as never,
        signer: toolbox.keypair,
    });
    return digest;
}

async function waitUntil(predicate: () => boolean, timeout: number): Promise<void> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline && !predicate()) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

describe('IotaClientGraphQLTransport subscriptions', () => {
    let toolbox: TestToolbox;
    let transport: IotaClientGraphQLTransport | null = null;

    beforeAll(async () => {
        toolbox = await setup({ rpcURL: LOCALNET_INDEXER });
    });

    afterEach(() => {
        transport?.close();
        transport = null;
    });

    test(
        'delivers a transaction executed after the subscription opened',
        async () => {
            transport = new IotaClientGraphQLTransport({ url: DEFAULT_GRAPHQL_URL });

            const digests: string[] = [];
            const unsubscribe = await transport.subscribe<{ transactionDigest: string }>({
                method: 'iotax_subscribeTransaction',
                unsubscribe: 'iotax_unsubscribeTransaction',
                params: [{}],
                onMessage: (effects) => digests.push(effects.transactionDigest),
            });

            const digest = await transfer(toolbox);
            await waitUntil(() => digests.includes(digest), DELIVERY_TIMEOUT);

            expect(digests).toContain(digest);
            await expect(unsubscribe()).resolves.toBe(true);
        },
        TEST_TIMEOUT,
    );

    test(
        'applies a FromAddress filter the server has to accept',
        async () => {
            transport = new IotaClientGraphQLTransport({ url: DEFAULT_GRAPHQL_URL });

            const digests: string[] = [];
            const unsubscribe = await transport.subscribe<{ transactionDigest: string }>({
                method: 'iotax_subscribeTransaction',
                unsubscribe: 'iotax_unsubscribeTransaction',
                params: [{ FromAddress: toolbox.address() }],
                onMessage: (effects) => digests.push(effects.transactionDigest),
            });

            const digest = await transfer(toolbox);
            await waitUntil(() => digests.includes(digest), DELIVERY_TIMEOUT);

            expect(digests).toContain(digest);
            await unsubscribe();
        },
        TEST_TIMEOUT,
    );

    test(
        'aborting the signal tears the subscription down',
        async () => {
            transport = new IotaClientGraphQLTransport({ url: DEFAULT_GRAPHQL_URL });
            const controller = new AbortController();

            const unsubscribe = await transport.subscribe({
                method: 'iotax_subscribeEvent',
                unsubscribe: 'iotax_unsubscribeEvent',
                params: [{}],
                onMessage: () => {},
                signal: controller.signal,
            });

            controller.abort();
            await new Promise((resolve) => setTimeout(resolve, 100));

            // The abort already ran the teardown, so a second call has nothing left to do.
            await expect(unsubscribe()).resolves.toBe(false);
        },
        TEST_TIMEOUT,
    );
});
