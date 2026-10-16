// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    chunkArray,
    getDefaultIotaNameQueryKey,
    isIndexedCoinNetwork,
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
    keepPreviousData,
    useInfiniteQuery,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    type CoinsFilter,
    type CoinsSort,
    type CoinsSortOrder,
    type OnChainCoin,
    useAppsBackendClient,
} from '@iota/apps-backend-client';
import { useNetworkContext } from '~/contexts';

export const COINS_PAGE_SIZE = 20;
const COINS_INDEXING_REFETCH_INTERVAL = 10_000;

export type { OnChainCoin };

export type CoinLabels = Pick<OnChainCoin, 'coinType' | 'name' | 'symbol'>;

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

interface CoinsQueryOptions {
    enabled?: boolean;
}

const COIN_METADATA_OBJECTS_QUERY = graphql(`
    query getCoinMetadataObjects($type: String!) {
        objects(filter: { type: $type }, first: 1) {
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
    coinType: string,
): Promise<CoinWithoutPublishInfo[]> {
    const response: CoinMetadataObjectsQueryResult = await graphQLClient.query({
        query: COIN_METADATA_OBJECTS_QUERY,
        variables: { type: `${COIN_OBJECT_TYPES[source]}<${coinType}>` },
    });

    const result = response.data?.objects;
    if (!result) return [];

    return result.nodes.flatMap(({ address, owner, asMoveObject }) => {
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
}

async function fetchCoinByType(
    graphQLClient: GraphQLClient,
    coinType: string,
): Promise<CoinWithoutPublishInfo[]> {
    const coins = await fetchCoinObjects(graphQLClient, 'metadata', coinType);
    if (coins.length > 0) return coins;

    return fetchCoinObjects(graphQLClient, 'manager', coinType);
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
 * A single coin by its type, or null when no coin with that type exists.
 */
export function useGetCoin(
    coinType: string,
    { enabled = true }: CoinsQueryOptions = {},
): UseQueryResult<OnChainCoin | null, Error> {
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
        enabled: enabled && !!iotaGraphQLClient,
        staleTime: 5 * 60 * 1000,
    });
}

function toCoinLabels({ coinType, name, symbol }: CoinLabels): CoinLabels {
    return { coinType, name, symbol };
}

/**
 * The labels (type, name and symbol) of the coins in our coin registry, in registry order.
 * They come from apps-backend on indexed networks, otherwise from GraphQL.
 */
export function useGetRecognizedCoins(): UseQueryResult<CoinLabels[], Error> {
    const appsBackendClient = useAppsBackendClient();
    const [network] = useNetworkContext();
    const { iotaGraphQLClient } = useIotaGraphQLClientContext();
    const coinTypes = useCoinRegistry().map(({ coinType }) => normalizeStructTag(coinType));

    return useQuery<CoinLabels[], Error>({
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['recognized-coins', network, coinTypes],
        queryFn: async () => {
            if (isIndexedCoinNetwork(network)) {
                const response = await appsBackendClient.getCoins({
                    network,
                    filter: 'recognized',
                    limit: coinTypes.length,
                });
                if (response) return response.coins.map(toCoinLabels);
            }
            const coins = await Promise.all(
                coinTypes.map((coinType) => fetchCoinByType(iotaGraphQLClient!, coinType)),
            );
            return coins.flat().map(toCoinLabels);
        },
        enabled: !!iotaGraphQLClient && coinTypes.length > 0,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * The coins indexed by apps-backend, filtered and searched on the server, one page at a time.
 * A page is null while apps-backend is still indexing the network, and the query keeps
 * polling until the coins are ready.
 */
export function useGetIndexedCoins(
    filter: CoinsFilter,
    search: string,
    sort: CoinsSort | undefined,
    order: CoinsSortOrder,
    { enabled = true }: CoinsQueryOptions = {},
) {
    const appsBackendClient = useAppsBackendClient();
    const [network] = useNetworkContext();
    const { iotaGraphQLClient } = useIotaGraphQLClientContext();
    const queryClient = useQueryClient();

    return useInfiniteQuery({
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['apps-backend', 'coins', network, filter, search, sort, order],
        initialPageParam: 0,
        queryFn: async ({ pageParam }) => {
            const response = await appsBackendClient.getCoins({
                network,
                filter,
                search,
                sort,
                order,
                offset: pageParam,
                limit: COINS_PAGE_SIZE,
            });
            if (response) {
                await cacheCreatorNames(iotaGraphQLClient!, queryClient, response.coins);
            }
            return response;
        },
        getNextPageParam: (page) => page?.nextOffset ?? null,
        refetchInterval: ({ state }) =>
            state.data?.pages[0] === null ? COINS_INDEXING_REFETCH_INTERVAL : false,
        placeholderData: keepPreviousData,
        enabled: enabled && !!iotaGraphQLClient,
        staleTime: 5 * 60 * 1000,
    });
}
