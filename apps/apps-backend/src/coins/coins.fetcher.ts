// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getNetwork, IotaClient, Network } from '@iota/iota-sdk/client';
import { IotaGraphQLClient } from '@iota/iota-sdk/graphql';
import { graphql } from '@iota/iota-sdk/graphql/schemas/2025.2';
import { normalizeStructTag, parseStructTag } from '@iota/iota-sdk/utils';

import { CoinSource, OnChainCoin } from './coins.types';
import {
    COIN_OBJECT_TYPES,
    INITIAL_RETRY_DELAY_MS,
    MAX_RETRIES,
    MAX_RPC_BATCH_SIZE,
    COINS_PER_PAGE,
    COIN_REQUEST_DELAY_MS,
} from './coins.constants';

interface CoinMetadataJson {
    decimals: number;
    name: string;
    symbol: string;
    description: string;
    icon_url: { url: string } | null;
}

interface CoinManagerJson {
    treasury_cap: { total_supply: { value: string } } | null;
    metadata: CoinMetadataJson | null;
}

interface CoinObjectsQueryResult {
    objects: {
        pageInfo: { hasNextPage: boolean; endCursor?: string | null };
        nodes: {
            address: string;
            owner?: { __typename: string } | null;
            asMoveObject?: {
                contents?: { type: { repr: string }; json: unknown } | null;
                asCoinMetadata?: { supply?: string | null } | null;
            } | null;
        }[];
    } | null;
}

interface CoinWithoutPublishInfo extends Omit<
    OnChainCoin,
    'creator' | 'createdAt' | 'publishDigest'
> {
    // The object whose last transaction created the coin: its metadata when
    // frozen, since frozen objects never change again, otherwise its package.
    originObjectId: string;
}

const COIN_OBJECTS_QUERY = graphql(`
    query getCoinObjects($type: String!, $first: Int!, $after: String) {
        objects(filter: { type: $type }, first: $first, after: $after) {
            pageInfo {
                hasNextPage
                endCursor
            }
            nodes {
                address
                owner {
                    __typename
                }
                asMoveObject {
                    contents {
                        type {
                            repr
                        }
                        json
                    }
                    asCoinMetadata {
                        supply
                    }
                }
            }
        }
    }
`);

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / chunkSize) }, (_, i) =>
        arr.slice(i * chunkSize, (i + 1) * chunkSize),
    );
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

// Most coins keep their metadata in a standalone `CoinMetadata` object. Coins
// migrated to a `CoinManager` keep it inside the manager instead.
async function fetchCoinObjectsPage(
    graphQLClient: IotaGraphQLClient,
    source: CoinSource,
    after: string | null,
): Promise<{ coins: CoinWithoutPublishInfo[]; nextCursor: string | null }> {
    const response = await throttled(() =>
        graphQLClient.query({
            query: COIN_OBJECTS_QUERY,
            variables: { type: COIN_OBJECT_TYPES[source], first: COINS_PER_PAGE, after },
        }),
    );
    // A missing page must fail the refresh, otherwise a partial list would replace the cached one.
    if (response.errors?.length || !response.data) {
        throw new Error(`Failed to fetch ${source} coin objects: ${response.errors?.[0]?.message}`);
    }

    const result = (response.data as CoinObjectsQueryResult).objects;
    if (!result) return { coins: [], nextCursor: null };

    const coins = result.nodes.flatMap(({ address, owner, asMoveObject }) => {
        const contents = asMoveObject?.contents;
        const [coinTypeTag] = contents ? parseStructTag(contents.type.repr).typeParams : [];
        if (!contents || !coinTypeTag) return [];
        const coinType = normalizeStructTag(coinTypeTag);
        const packageId = parseStructTag(coinType).address;

        if (source === 'manager') {
            const { metadata, treasury_cap } = contents.json as CoinManagerJson;
            if (!metadata) return [];
            return {
                coinType,
                originObjectId: packageId,
                name: metadata.name,
                symbol: metadata.symbol,
                decimals: metadata.decimals,
                description: metadata.description,
                iconUrl: metadata.icon_url?.url ?? null,
                supply: treasury_cap?.total_supply.value ?? null,
            };
        }

        const { name, symbol, decimals, description, icon_url } = contents.json as CoinMetadataJson;
        return {
            coinType,
            originObjectId: owner?.__typename === 'Immutable' ? address : packageId,
            name,
            symbol,
            decimals,
            description,
            iconUrl: icon_url?.url ?? null,
            supply: asMoveObject?.asCoinMetadata?.supply ?? null,
        };
    });

    return {
        coins,
        nextCursor: result.pageInfo.hasNextPage ? (result.pageInfo.endCursor ?? null) : null,
    };
}

async function fetchAllCoinObjects(
    graphQLClient: IotaGraphQLClient,
    source: CoinSource,
): Promise<CoinWithoutPublishInfo[]> {
    const coins: CoinWithoutPublishInfo[] = [];
    let after: string | null = null;
    do {
        const page = await fetchCoinObjectsPage(graphQLClient, source, after);
        coins.push(...page.coins);
        after = page.nextCursor;
    } while (after);
    return coins;
}

// GraphQL does not resolve the transaction that last touched an object, so it
// is fetched over RPC. Frozen metadata and packages don't change after they are
// created, so that transaction is the coin's creation. System packages (`0x2`)
// are upgraded in place, but their coins' metadata is frozen at genesis.
async function withPublishInfo(
    client: IotaClient,
    coins: CoinWithoutPublishInfo[],
): Promise<OnChainCoin[]> {
    const originIds = [...new Set(coins.map(({ originObjectId }) => originObjectId))];
    const origins = [];
    for (const ids of chunkArray(originIds, MAX_RPC_BATCH_SIZE)) {
        origins.push(
            ...(await throttled(() =>
                client.multiGetObjects({ ids, options: { showPreviousTransaction: true } }),
            )),
        );
    }
    const digestByOriginId = new Map(
        originIds.map((id, index) => [id, origins[index]?.data?.previousTransaction]),
    );
    const digests = coins.map(({ originObjectId }) => digestByOriginId.get(originObjectId) ?? null);

    const transactions = [];
    const uniqueDigests = [...new Set(digests.filter((digest) => digest !== null))];
    for (const chunk of chunkArray(uniqueDigests, MAX_RPC_BATCH_SIZE)) {
        transactions.push(
            ...(await throttled(() =>
                client.multiGetTransactionBlocks({ digests: chunk, options: { showInput: true } }),
            )),
        );
    }
    const transactionByDigest = new Map(
        transactions.map((transaction) => [transaction.digest, transaction]),
    );

    return coins.map(({ originObjectId: _, ...coin }, index) => {
        const digest = digests[index];
        const transaction = digest ? transactionByDigest.get(digest) : undefined;
        return {
            ...coin,
            creator: transaction?.transaction?.data.sender ?? null,
            createdAt: transaction?.timestampMs ? Number(transaction.timestampMs) : null,
            publishDigest: digest,
        };
    });
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
    return withPublishInfo(client, [...metadataCoins, ...managerCoins]);
}
