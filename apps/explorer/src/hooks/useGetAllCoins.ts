// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { chunkArray, useCoinRegistry, useIotaGraphQLClientContext } from '@iota/core';
import { useIotaClient } from '@iota/dapp-kit';
import { graphql } from '@iota/iota-sdk/graphql/schemas/2025.2';
import { normalizeStructTag, parseStructTag } from '@iota/iota-sdk/utils';
import type { IotaClient } from '@iota/iota-sdk/client';
import { type UseQueryResult, useInfiniteQuery, useQuery } from '@tanstack/react-query';

export interface OnChainCoin {
    coinType: string;
    name: string;
    symbol: string;
    decimals: number;
    description: string;
    iconUrl: string | null;
    creator: string | null;
    createdAt: number | null;
    publishDigest: string | null;
    supply: string | null;
}

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

interface CoinMetadataObjectsQueryResult {
    data?: {
        objects: {
            pageInfo: { hasNextPage: boolean; endCursor?: string | null };
            nodes: {
                asMoveObject?: {
                    contents?: { type: { repr: string }; json: unknown } | null;
                    asCoinMetadata?: { supply?: string | null } | null;
                } | null;
            }[];
        } | null;
    } | null;
}

interface CoinObjectAddressesQueryResult {
    data?: {
        objects: {
            pageInfo: { hasNextPage: boolean; endCursor?: string | null };
            nodes: { address: string }[];
        } | null;
    } | null;
}

type CoinSource = 'metadata' | 'manager';

interface CoinsPageParam {
    source: CoinSource;
    cursor: string | null;
}

interface OnChainCoinsPage {
    coins: OnChainCoin[];
    nextCursor: CoinsPageParam | null;
}

const COIN_METADATA_OBJECTS_QUERY = graphql(`
    query getCoinMetadataObjects($type: String!, $first: Int!, $after: String) {
        objects(filter: { type: $type }, first: $first, after: $after) {
            pageInfo {
                hasNextPage
                endCursor
            }
            nodes {
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

const COIN_OBJECT_ADDRESSES_QUERY = graphql(`
    query getCoinObjectAddresses($type: String!, $first: Int!, $after: String) {
        objects(filter: { type: $type }, first: $first, after: $after) {
            pageInfo {
                hasNextPage
                endCursor
            }
            nodes {
                address
            }
        }
    }
`);

const PAGE_SIZE = 50;
const COIN_OBJECT_TYPES: Record<CoinSource, string> = {
    metadata: '0x2::coin::CoinMetadata',
    manager: '0x2::coin_manager::CoinManager',
};
const MAX_RPC_BATCH_SIZE = 50;

type GraphQLClient = NonNullable<
    ReturnType<typeof useIotaGraphQLClientContext>['iotaGraphQLClient']
>;
type CoinWithoutPublishInfo = Omit<OnChainCoin, 'creator' | 'createdAt' | 'publishDigest'>;

// Most coins keep their metadata in a standalone `CoinMetadata` object. Coins
// migrated to a `CoinManager` keep it inside the manager instead.
async function fetchCoinObjects(
    graphQLClient: GraphQLClient,
    source: CoinSource,
    coinType: string | null,
    first: number,
    after: string | null,
): Promise<{ coins: CoinWithoutPublishInfo[]; nextCursor: string | null }> {
    const objectType = COIN_OBJECT_TYPES[source];
    const response: CoinMetadataObjectsQueryResult = await graphQLClient.query({
        query: COIN_METADATA_OBJECTS_QUERY,
        variables: {
            type: coinType ? `${objectType}<${coinType}>` : objectType,
            first,
            after,
        },
    });

    const result = response.data?.objects;
    if (!result) return { coins: [], nextCursor: null };

    const coins = result.nodes.flatMap(({ asMoveObject }) => {
        const contents = asMoveObject?.contents;
        const [coinTypeTag] = contents ? parseStructTag(contents.type.repr).typeParams : [];
        if (!contents || !coinTypeTag) return [];

        if (source === 'manager') {
            const { metadata, treasury_cap } = contents.json as CoinManagerJson;
            if (!metadata) return [];
            return {
                coinType: normalizeStructTag(coinTypeTag),
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
            coinType: normalizeStructTag(coinTypeTag),
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

async function fetchCoinByType(
    graphQLClient: GraphQLClient,
    coinType: string,
): Promise<CoinWithoutPublishInfo[]> {
    const { coins } = await fetchCoinObjects(graphQLClient, 'metadata', coinType, 1, null);
    if (coins.length > 0) return coins;

    return (await fetchCoinObjects(graphQLClient, 'manager', coinType, 1, null)).coins;
}

/**
 * Lists the standalone `CoinMetadata` coins first and then the `CoinManager`
 * ones, filling the page that crosses from one source to the other.
 */
async function fetchCoinsPage(
    graphQLClient: GraphQLClient,
    pageSize: number,
    { source, cursor }: CoinsPageParam,
): Promise<{ coins: CoinWithoutPublishInfo[]; nextCursor: CoinsPageParam | null }> {
    const page = await fetchCoinObjects(graphQLClient, source, null, pageSize, cursor);
    if (page.nextCursor) {
        return { coins: page.coins, nextCursor: { source, cursor: page.nextCursor } };
    }
    if (source === 'manager') {
        return { coins: page.coins, nextCursor: null };
    }

    const remaining = pageSize - page.coins.length;
    if (remaining === 0) {
        return { coins: page.coins, nextCursor: { source: 'manager', cursor: null } };
    }

    const managers = await fetchCoinObjects(graphQLClient, 'manager', null, remaining, null);
    return {
        coins: [...page.coins, ...managers.coins],
        nextCursor: managers.nextCursor ? { source: 'manager', cursor: managers.nextCursor } : null,
    };
}

// GraphQL does not resolve the transaction that last touched an object, so it
// is fetched over RPC. Packages never change after publish, so the last
// transaction of the package that defines the coin type is its publish.
async function withPublishInfo(
    client: IotaClient,
    coins: CoinWithoutPublishInfo[],
): Promise<OnChainCoin[]> {
    const packageIds = coins.map(({ coinType }) => parseStructTag(coinType).address);
    const uniquePackageIds = [...new Set(packageIds)];
    const packages = (
        await Promise.all(
            chunkArray(uniquePackageIds, MAX_RPC_BATCH_SIZE).map((ids) =>
                client.multiGetObjects({ ids, options: { showPreviousTransaction: true } }),
            ),
        )
    ).flat();
    const digestByPackageId = new Map(
        uniquePackageIds.map((id, index) => [id, packages[index]?.data?.previousTransaction]),
    );
    const digests = packageIds.map((id) => digestByPackageId.get(id) ?? null);

    const transactions = (
        await Promise.all(
            chunkArray(
                [...new Set(digests.filter((digest) => digest !== null))],
                MAX_RPC_BATCH_SIZE,
            ).map((chunk) =>
                client.multiGetTransactionBlocks({ digests: chunk, options: { showInput: true } }),
            ),
        )
    ).flat();
    const transactionByDigest = new Map(
        transactions.map((transaction) => [transaction.digest, transaction]),
    );

    return coins.map((coin, index) => {
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
 * Every coin on chain, paginated. Passing a `coinType` narrows the result to
 * that single coin.
 */
export function useGetAllCoins(pageSize = PAGE_SIZE, coinType?: string | null) {
    const { iotaGraphQLClient } = useIotaGraphQLClientContext();
    const client = useIotaClient();

    return useInfiniteQuery<OnChainCoinsPage, Error>({
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['all-coins', pageSize, coinType],
        initialPageParam: { source: 'metadata', cursor: null } satisfies CoinsPageParam,
        queryFn: async ({ pageParam }) => {
            if (coinType) {
                const coins = await fetchCoinByType(iotaGraphQLClient!, coinType);
                return { coins: await withPublishInfo(client, coins), nextCursor: null };
            }
            const { coins, nextCursor } = await fetchCoinsPage(
                iotaGraphQLClient!,
                pageSize,
                pageParam as CoinsPageParam,
            );
            return { coins: await withPublishInfo(client, coins), nextCursor };
        },
        getNextPageParam: ({ nextCursor }) => nextCursor,
        enabled: !!iotaGraphQLClient,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * The coins in our coin registry, in registry order.
 */
export function useGetRecognizedCoins(): UseQueryResult<OnChainCoin[], Error> {
    const { iotaGraphQLClient } = useIotaGraphQLClientContext();
    const client = useIotaClient();
    const coinTypes = useCoinRegistry().map(({ coinType }) => normalizeStructTag(coinType));

    return useQuery<OnChainCoin[], Error>({
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['recognized-coins', coinTypes],
        queryFn: async () => {
            const coins = await Promise.all(
                coinTypes.map((coinType) => fetchCoinByType(iotaGraphQLClient!, coinType)),
            );
            return withPublishInfo(client, coins.flat());
        },
        enabled: !!iotaGraphQLClient && coinTypes.length > 0,
        staleTime: 5 * 60 * 1000,
    });
}

// GraphQL has no total count for objects, so every page is walked fetching
// only addresses.
async function countCoinObjects(graphQLClient: GraphQLClient, source: CoinSource) {
    let count = 0;
    let after: string | null = null;
    do {
        const response: CoinObjectAddressesQueryResult = await graphQLClient.query({
            query: COIN_OBJECT_ADDRESSES_QUERY,
            variables: { type: COIN_OBJECT_TYPES[source], first: PAGE_SIZE, after },
        });
        const result = response.data?.objects;
        if (!result) break;
        count += result.nodes.length;
        after = result.pageInfo.hasNextPage ? (result.pageInfo.endCursor ?? null) : null;
    } while (after);
    return count;
}

/**
 * How many coins exist on chain, standalone `CoinMetadata` and `CoinManager` ones together.
 */
export function useGetCoinsCount(): UseQueryResult<number, Error> {
    const { iotaGraphQLClient } = useIotaGraphQLClientContext();

    return useQuery<number, Error>({
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['coins-count'],
        queryFn: async () => {
            const [metadataCount, managerCount] = await Promise.all([
                countCoinObjects(iotaGraphQLClient!, 'metadata'),
                countCoinObjects(iotaGraphQLClient!, 'manager'),
            ]);
            return metadataCount + managerCount;
        },
        enabled: !!iotaGraphQLClient,
        staleTime: 5 * 60 * 1000,
    });
}
