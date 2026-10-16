// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { OnChainCoin } from '@iota/apps-backend-client';
import type {
    IotaClient,
    IotaObjectResponse,
    IotaTransactionBlockResponse,
} from '@iota/iota-sdk/client';
import type { IotaGraphQLClient } from '@iota/iota-sdk/graphql';
import { graphql } from '@iota/iota-sdk/graphql/schemas/2025.2';
import { normalizeStructTag, parseStructTag } from '@iota/iota-sdk/utils';
import { chunkArray } from '../chunkArray';

export type CoinSource = 'metadata' | 'manager';

export interface CoinWithoutPublishInfo extends Omit<
    OnChainCoin,
    'creator' | 'createdAt' | 'publishDigest'
> {
    // The object whose last transaction created the coin: its metadata when
    // frozen, since frozen objects never change again, otherwise its package.
    originObjectId: string;
}

export interface CoinObjectsPage {
    coins: CoinWithoutPublishInfo[];
    nextCursor: string | null;
}

/**
 * Runs a single network request. Callers pass one to throttle or retry requests.
 */
export type CoinRequestRunner = <T>(request: () => Promise<T>) => Promise<T>;

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

const COIN_OBJECT_TYPES: Record<CoinSource, string> = {
    metadata: '0x2::coin::CoinMetadata',
    manager: '0x2::coin_manager::CoinManager',
};
const MAX_RPC_BATCH_SIZE = 50;

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

const runDirectly: CoinRequestRunner = (request) => request();

/**
 * Most coins keep their metadata in a standalone `CoinMetadata` object. Coins
 * migrated to a `CoinManager` keep it inside the manager instead. Passing a
 * `coinType` narrows the page to that coin.
 */
export async function fetchCoinObjectsPage(
    graphQLClient: IotaGraphQLClient,
    source: CoinSource,
    { coinType, first, after = null }: { coinType?: string; first: number; after?: string | null },
    run: CoinRequestRunner = runDirectly,
): Promise<CoinObjectsPage> {
    const objectType = COIN_OBJECT_TYPES[source];
    const response = await run(() =>
        graphQLClient.query({
            query: COIN_OBJECTS_QUERY,
            variables: { type: coinType ? `${objectType}<${coinType}>` : objectType, first, after },
        }),
    );
    if (response.errors?.length || !response.data) {
        throw new Error(`Failed to fetch ${source} coin objects: ${response.errors?.[0]?.message}`);
    }

    const result = (response.data as CoinObjectsQueryResult).objects;
    if (!result) return { coins: [], nextCursor: null };

    const coins = result.nodes.flatMap(({ address, owner, asMoveObject }) => {
        const contents = asMoveObject?.contents;
        const [coinTypeTag] = contents ? parseStructTag(contents.type.repr).typeParams : [];
        if (!contents || !coinTypeTag) return [];
        const objectCoinType = normalizeStructTag(coinTypeTag);
        const packageId = parseStructTag(objectCoinType).address;

        if (source === 'manager') {
            const { metadata, treasury_cap } = contents.json as CoinManagerJson;
            if (!metadata) return [];
            return {
                coinType: objectCoinType,
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
            coinType: objectCoinType,
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

/**
 * The coin with the given type, looked up as a `CoinMetadata` coin first and then as a
 * `CoinManager` one. Empty when no coin with that type exists.
 */
export async function fetchCoinByType(
    graphQLClient: IotaGraphQLClient,
    coinType: string,
): Promise<CoinWithoutPublishInfo[]> {
    const { coins } = await fetchCoinObjectsPage(graphQLClient, 'metadata', { coinType, first: 1 });
    if (coins.length > 0) return coins;

    return (await fetchCoinObjectsPage(graphQLClient, 'manager', { coinType, first: 1 })).coins;
}

/**
 * GraphQL does not resolve the transaction that last touched an object, so it
 * is fetched over RPC. Frozen metadata and packages don't change after they are
 * created, so that transaction is the coin's creation. System packages (`0x2`)
 * are upgraded in place, but their coins' metadata is frozen at genesis.
 */
export async function withCoinPublishInfo(
    client: IotaClient,
    coins: CoinWithoutPublishInfo[],
    run: CoinRequestRunner = runDirectly,
): Promise<OnChainCoin[]> {
    const originIds = [...new Set(coins.map(({ originObjectId }) => originObjectId))];
    const origins: IotaObjectResponse[] = [];
    for (const ids of chunkArray(originIds, MAX_RPC_BATCH_SIZE)) {
        origins.push(
            ...(await run(() =>
                client.multiGetObjects({ ids, options: { showPreviousTransaction: true } }),
            )),
        );
    }
    const digestByOriginId = new Map(
        originIds.map((id, index) => [id, origins[index]?.data?.previousTransaction]),
    );
    const digests = coins.map(({ originObjectId }) => digestByOriginId.get(originObjectId) ?? null);

    const transactions: IotaTransactionBlockResponse[] = [];
    const uniqueDigests = [...new Set(digests.filter((digest) => digest !== null))];
    for (const chunk of chunkArray(uniqueDigests, MAX_RPC_BATCH_SIZE)) {
        transactions.push(
            ...(await run(() =>
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
