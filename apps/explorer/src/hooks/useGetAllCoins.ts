// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    chunkArray,
    fetchCoinByType,
    getDefaultIotaNameQueryKey,
    setDefaultIotaNameQueryData,
    useCoinRegistry,
    useIotaGraphQLClientContext,
    withCoinPublishInfo,
} from '@iota/core';
import { useIotaClient } from '@iota/dapp-kit';
import { normalizeStructTag } from '@iota/iota-sdk/utils';
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

interface CoinsQueryOptions {
    enabled?: boolean;
}

// GraphQL caps the query part (including variables) at 5000 bytes, about 30 addresses.
const NAME_LOOKUP_BATCH_SIZE = 25;

type GraphQLClient = NonNullable<
    ReturnType<typeof useIotaGraphQLClientContext>['iotaGraphQLClient']
>;

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
            const [coin] = await withCoinPublishInfo(client, coins);
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
 * They come from apps-backend when it indexes the network, otherwise from GraphQL.
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
            const result = await appsBackendClient.getCoins({
                network,
                filter: 'recognized',
                limit: coinTypes.length,
            });
            if (result.status === 'ready') return result.coins.map(toCoinLabels);

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
 * While apps-backend is still indexing the network the query keeps polling until the
 * coins are ready.
 */
export function useGetIndexedCoins(
    filter: CoinsFilter,
    search: string,
    sort: CoinsSort | undefined,
    order: CoinsSortOrder,
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
            const result = await appsBackendClient.getCoins({
                network,
                filter,
                search,
                sort,
                order,
                offset: pageParam,
                limit: COINS_PAGE_SIZE,
            });
            if (result.status === 'ready') {
                await cacheCreatorNames(iotaGraphQLClient!, queryClient, result.coins);
            }
            return result;
        },
        getNextPageParam: (page) => (page.status === 'ready' ? page.nextOffset : null),
        refetchInterval: ({ state }) =>
            state.data?.pages[0]?.status === 'indexing' ? COINS_INDEXING_REFETCH_INTERVAL : false,
        placeholderData: keepPreviousData,
        enabled: !!iotaGraphQLClient,
        staleTime: 5 * 60 * 1000,
    });
}
