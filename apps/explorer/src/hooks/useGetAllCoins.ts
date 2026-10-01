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
    metadataId: string;
    name: string;
    symbol: string;
    decimals: number;
    description: string;
    iconUrl: string | null;
    creator: string | null;
    createdAt: number | null;
    supply: string | null;
}

interface CoinMetadataJson {
    decimals: number;
    name: string;
    symbol: string;
    description: string;
    icon_url: { url: string } | null;
}

interface CoinMetadataObjectsQueryResult {
    data?: {
        objects: {
            pageInfo: { hasNextPage: boolean; endCursor?: string | null };
            nodes: {
                address: string;
                asMoveObject?: {
                    contents?: { type: { repr: string }; json: unknown } | null;
                    asCoinMetadata?: { supply?: string | null } | null;
                } | null;
            }[];
        } | null;
    } | null;
}

interface OnChainCoinsPage {
    coins: OnChainCoin[];
    nextCursor: string | null;
}

const COIN_METADATA_OBJECTS_QUERY = graphql(`
    query getCoinMetadataObjects($type: String!, $first: Int!, $after: String) {
        objects(filter: { type: $type }, first: $first, after: $after) {
            pageInfo {
                hasNextPage
                endCursor
            }
            nodes {
                address
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

const PAGE_SIZE = 50;
const COIN_METADATA_TYPE = '0x2::coin::CoinMetadata';
const MAX_RPC_BATCH_SIZE = 50;

type GraphQLClient = NonNullable<
    ReturnType<typeof useIotaGraphQLClientContext>['iotaGraphQLClient']
>;
type CoinWithoutPublishInfo = Omit<OnChainCoin, 'creator' | 'createdAt'>;

async function fetchCoinMetadataObjects(
    graphQLClient: GraphQLClient,
    coinType: string | null,
    first: number,
    after: string | null,
): Promise<{ coins: CoinWithoutPublishInfo[]; nextCursor: string | null }> {
    const response: CoinMetadataObjectsQueryResult = await graphQLClient.query({
        query: COIN_METADATA_OBJECTS_QUERY,
        variables: {
            type: coinType ? `${COIN_METADATA_TYPE}<${coinType}>` : COIN_METADATA_TYPE,
            first,
            after,
        },
    });

    const result = response.data?.objects;
    if (!result) return { coins: [], nextCursor: null };

    const coins = result.nodes.flatMap(({ address, asMoveObject }) => {
        const contents = asMoveObject?.contents;
        const [coinTypeTag] = contents ? parseStructTag(contents.type.repr).typeParams : [];
        if (!contents || !coinTypeTag) return [];

        const { name, symbol, decimals, description, icon_url } = contents.json as CoinMetadataJson;
        return {
            coinType: normalizeStructTag(coinTypeTag),
            metadataId: address,
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

// GraphQL does not resolve the transaction that last touched these objects, so
// it is fetched over RPC. Metadata is usually frozen at publish, which makes
// that transaction the publish and its sender the coin creator.
async function withPublishInfo(
    client: IotaClient,
    coins: CoinWithoutPublishInfo[],
): Promise<OnChainCoin[]> {
    const objects = (
        await Promise.all(
            chunkArray(
                coins.map(({ metadataId }) => metadataId),
                MAX_RPC_BATCH_SIZE,
            ).map((ids) =>
                client.multiGetObjects({ ids, options: { showPreviousTransaction: true } }),
            ),
        )
    ).flat();
    const digests = objects.map((object) => object.data?.previousTransaction ?? null);

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
        };
    });
}

/**
 * Every coin on chain that has a `CoinMetadata` object, paginated. Migrated
 * coins keep their metadata in a `CoinManager` instead, so they are not listed.
 * Passing a `coinType` narrows the result to that single coin.
 */
export function useGetAllCoins(pageSize = PAGE_SIZE, coinType?: string | null) {
    const { iotaGraphQLClient } = useIotaGraphQLClientContext();
    const client = useIotaClient();

    return useInfiniteQuery<OnChainCoinsPage, Error>({
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['all-coins', pageSize, coinType],
        initialPageParam: null,
        queryFn: async ({ pageParam }) => {
            const { coins, nextCursor } = await fetchCoinMetadataObjects(
                iotaGraphQLClient!,
                coinType ?? null,
                pageSize,
                pageParam as string | null,
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
            const pages = await Promise.all(
                coinTypes.map((coinType) =>
                    fetchCoinMetadataObjects(iotaGraphQLClient!, coinType, 1, null),
                ),
            );
            return withPublishInfo(
                client,
                pages.flatMap(({ coins }) => coins),
            );
        },
        enabled: !!iotaGraphQLClient && coinTypes.length > 0,
        staleTime: 5 * 60 * 1000,
    });
}
