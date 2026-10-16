// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    CoinSource,
    CoinWithoutPublishInfo,
    fetchCoinObjectsPage,
    withCoinPublishInfo,
} from '@iota/core/utils/coins/onChainCoins';
import { getNetwork, IotaClient, Network } from '@iota/iota-sdk/client';
import { IotaGraphQLClient } from '@iota/iota-sdk/graphql';

import { OnChainCoin } from './coins.types';
import {
    INITIAL_RETRY_DELAY_MS,
    MAX_RETRIES,
    COINS_PER_PAGE,
    COIN_REQUEST_DELAY_MS,
} from './coins.constants';

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Requests go out one at a time with a short pause between them, and failed
// ones (such as 429 rate limits) are retried with exponential backoff.
async function throttled<T>(request: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        await sleep(COIN_REQUEST_DELAY_MS);
        try {
            return await request();
        } catch (error) {
            if (attempt >= MAX_RETRIES) throw error;
            await sleep(INITIAL_RETRY_DELAY_MS * 2 ** attempt);
        }
    }
}

// A missing page must fail the refresh, otherwise a partial list would replace
// the cached one, so page errors are not swallowed.
async function fetchAllCoinObjects(
    graphQLClient: IotaGraphQLClient,
    source: CoinSource,
): Promise<CoinWithoutPublishInfo[]> {
    const coins: CoinWithoutPublishInfo[] = [];
    let after: string | null = null;
    do {
        const page = await fetchCoinObjectsPage(
            graphQLClient,
            source,
            { first: COINS_PER_PAGE, after },
            throttled,
        );
        coins.push(...page.coins);
        after = page.nextCursor;
    } while (after);
    return coins;
}

/**
 * Every coin on the network, standalone `CoinMetadata` and `CoinManager` ones together.
 */
export async function fetchAllCoins(network: Network): Promise<OnChainCoin[]> {
    const { url, graphql: graphQLUrl } = getNetwork(network);
    if (!graphQLUrl) {
        throw new Error(`No GraphQL endpoint configured for ${network}`);
    }
    const graphQLClient = new IotaGraphQLClient({ url: graphQLUrl });
    const client = new IotaClient({ url });

    const metadataCoins = await fetchAllCoinObjects(graphQLClient, 'metadata');
    const managerCoins = await fetchAllCoinObjects(graphQLClient, 'manager');
    return withCoinPublishInfo(client, [...metadataCoins, ...managerCoins], throttled);
}
