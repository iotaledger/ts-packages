// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    chunkArray,
    getDefaultIotaNameQueryKey,
    setDefaultIotaNameQueryData,
    useCoinRegistry,
    useIotaGraphQLClientContext,
} from '@iota/core';
import { useIotaClient } from '@iota/dapp-kit';
import { graphql } from '@iota/iota-sdk/graphql/schemas/2025.2';
import { normalizeStructTag, parseStructTag } from '@iota/iota-sdk/utils';
import type { IotaClient } from '@iota/iota-sdk/client';
import {
    type QueryClient,
    type UseQueryResult,
    useInfiniteQuery,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

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
                address: string;
                owner?: { __typename: string } | null;
                asMoveObject?: {
                    contents?: { type: { repr: string }; json: unknown } | null;
                    asCoinMetadata?: { supply?: string | null } | null;
                } | null;
            }[];
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

const PAGE_SIZE = 50;
const COIN_OBJECT_TYPES: Record<CoinSource, string> = {
    metadata: '0x2::coin::CoinMetadata',
    manager: '0x2::coin_manager::CoinManager',
};
const MAX_RPC_BATCH_SIZE = 50;
// GraphQL caps the query part (including variables) at 5000 bytes, about 30 addresses.
const NAME_LOOKUP_BATCH_SIZE = 25;

type GraphQLClient = NonNullable<
    ReturnType<typeof useIotaGraphQLClientContext>['iotaGraphQLClient']
>;
interface CoinWithoutPublishInfo extends Omit<
    OnChainCoin,
    'creator' | 'createdAt' | 'publishDigest'
> {
    // The object whose last transaction created the coin: its metadata when
    // frozen, since frozen objects never change again, otherwise its package.
    originObjectId: string;
}

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
// is fetched over RPC. Frozen metadata and packages don't change after they are
// created, so that transaction is the coin's creation. System packages (`0x2`)
// are upgraded in place, but their coins' metadata is frozen at genesis.
async function withPublishInfo(
    client: IotaClient,
    coins: CoinWithoutPublishInfo[],
): Promise<OnChainCoin[]> {
    const originIds = [...new Set(coins.map(({ originObjectId }) => originObjectId))];
    const origins = (
        await Promise.all(
            chunkArray(originIds, MAX_RPC_BATCH_SIZE).map((ids) =>
                client.multiGetObjects({ ids, options: { showPreviousTransaction: true } }),
            ),
        )
    ).flat();
    const digestByOriginId = new Map(
        originIds.map((id, index) => [id, origins[index]?.data?.previousTransaction]),
    );
    const digests = coins.map(({ originObjectId }) => digestByOriginId.get(originObjectId) ?? null);

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
 * Looks up the default IOTA names of the coins' creators, several per GraphQL
 * request, and caches them for `AddressLink`. Without this every creator cell
 * fires its own name request, which hits the GraphQL rate limit.
 */
async function cacheCreatorNames(
    graphQLClient: GraphQLClient,
    queryClient: QueryClient,
    coins: OnChainCoin[],
): Promise<void> {
    const creators = [
        ...new Set(coins.flatMap(({ creator }) => (creator ? [creator] : []))),
    ].filter(
        (address) => queryClient.getQueryData(getDefaultIotaNameQueryKey(address)) === undefined,
    );

    await Promise.all(
        chunkArray(creators, NAME_LOOKUP_BATCH_SIZE).map(async (addresses) => {
            const variables = Object.fromEntries(addresses.map((address, i) => [`a${i}`, address]));
            const declarations = addresses.map((_, i) => `$a${i}: IotaAddress!`).join(',');
            const fields = addresses
                .map((_, i) => `a${i}: address(address: $a${i}) { iotaNamesDefaultName }`)
                .join(' ');
            const query = `query(${declarations}) { ${fields} }`;
            try {
                const { data } = await graphQLClient.query<
                    Record<string, { iotaNamesDefaultName: string | null } | null>
                >({ query, variables });
                addresses.forEach((address, i) =>
                    setDefaultIotaNameQueryData(
                        queryClient,
                        address,
                        data?.[`a${i}`]?.iotaNamesDefaultName,
                    ),
                );
            } catch {
                // Names are optional; `AddressLink` falls back to its own lookup.
            }
        }),
    );
}

/**
 * Every coin on chain, paginated. Passing a `coinType` narrows the result to
 * that single coin.
 */
export function useGetAllCoins(pageSize = PAGE_SIZE, coinType?: string | null) {
    const { iotaGraphQLClient } = useIotaGraphQLClientContext();
    const client = useIotaClient();
    const queryClient = useQueryClient();

    return useInfiniteQuery<OnChainCoinsPage, Error>({
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['all-coins', pageSize, coinType],
        initialPageParam: { source: 'metadata', cursor: null } satisfies CoinsPageParam,
        queryFn: async ({ pageParam }) => {
            const { coins, nextCursor } = coinType
                ? { coins: await fetchCoinByType(iotaGraphQLClient!, coinType), nextCursor: null }
                : await fetchCoinsPage(iotaGraphQLClient!, pageSize, pageParam as CoinsPageParam);
            const coinsWithPublishInfo = await withPublishInfo(client, coins);
            await cacheCreatorNames(iotaGraphQLClient!, queryClient, coinsWithPublishInfo);
            return { coins: coinsWithPublishInfo, nextCursor };
        },
        getNextPageParam: ({ nextCursor }) => nextCursor,
        enabled: !!iotaGraphQLClient,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * A single coin by its type, or null when no coin with that type exists.
 */
export function useGetCoin(coinType: string): UseQueryResult<OnChainCoin | null, Error> {
    const { iotaGraphQLClient } = useIotaGraphQLClientContext();
    const client = useIotaClient();
    const queryClient = useQueryClient();

    return useQuery<OnChainCoin | null, Error>({
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['coin', coinType],
        queryFn: async () => {
            const coins = await fetchCoinByType(iotaGraphQLClient!, coinType);
            const [coin] = await withPublishInfo(client, coins);
            if (!coin) return null;
            await cacheCreatorNames(iotaGraphQLClient!, queryClient, [coin]);
            return coin;
        },
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
    const queryClient = useQueryClient();
    const coinTypes = useCoinRegistry().map(({ coinType }) => normalizeStructTag(coinType));

    return useQuery<OnChainCoin[], Error>({
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['recognized-coins', coinTypes],
        queryFn: async () => {
            const coins = await Promise.all(
                coinTypes.map((coinType) => fetchCoinByType(iotaGraphQLClient!, coinType)),
            );
            const coinsWithPublishInfo = await withPublishInfo(client, coins.flat());
            await cacheCreatorNames(iotaGraphQLClient!, queryClient, coinsWithPublishInfo);
            return coinsWithPublishInfo;
        },
        enabled: !!iotaGraphQLClient && coinTypes.length > 0,
        staleTime: 5 * 60 * 1000,
    });
}
