// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { setDefaultIotaNameQueryData, useIotaGraphQLClientContext } from '@iota/core';
import { graphql } from '@iota/iota-sdk/graphql/schemas/2025.2';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export type CoinObjectOwner =
    | { kind: 'Address'; address: string }
    | { kind: 'Object'; address: string }
    | { kind: 'Shared' }
    | { kind: 'Immutable' };

export interface CoinObject {
    objectId: string;
    balance: string;
    owner: CoinObjectOwner | null;
}

interface CoinObjectsPage {
    coinObjects: CoinObject[];
    nextCursor: string | null;
}

type CoinObjectOwnerNode =
    | {
          __typename: 'AddressOwner';
          owner?: { address: string; iotaNamesDefaultName?: string | null } | null;
      }
    | { __typename: 'Parent'; parent?: { address: string } | null }
    | { __typename: 'Shared' }
    | { __typename: 'Immutable' };

interface CoinObjectsQueryResult {
    data?: {
        coins: {
            pageInfo: { hasNextPage: boolean; endCursor?: string | null };
            nodes: {
                address: string;
                coinBalance?: string | null;
                owner?: CoinObjectOwnerNode | null;
            }[];
        };
    } | null;
}

const COIN_OBJECTS_QUERY = graphql(`
    query getCoinObjects($type: String!, $first: Int!, $after: String) {
        coins(type: $type, first: $first, after: $after) {
            pageInfo {
                hasNextPage
                endCursor
            }
            nodes {
                address
                coinBalance
                owner {
                    __typename
                    ... on AddressOwner {
                        owner {
                            address
                            iotaNamesDefaultName
                        }
                    }
                    ... on Parent {
                        parent {
                            address
                        }
                    }
                }
            }
        }
    }
`);

function toCoinObjectOwner(owner?: CoinObjectOwnerNode | null): CoinObjectOwner | null {
    switch (owner?.__typename) {
        case 'AddressOwner':
            return owner.owner ? { kind: 'Address', address: owner.owner.address } : null;
        case 'Parent':
            return owner.parent ? { kind: 'Object', address: owner.parent.address } : null;
        case 'Shared':
            return { kind: 'Shared' };
        case 'Immutable':
            return { kind: 'Immutable' };
        default:
            return null;
    }
}

/**
 * The `Coin<T>` objects of a coin type, paginated in the order GraphQL returns
 * them. There is no sorting or grouping by owner.
 */
export function useGetCoinObjects(coinType: string, pageSize: number) {
    const { iotaGraphQLClient } = useIotaGraphQLClientContext();
    const queryClient = useQueryClient();

    return useInfiniteQuery<CoinObjectsPage, Error>({
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['coin-objects', coinType, pageSize],
        initialPageParam: null,
        queryFn: async ({ pageParam }) => {
            const response: CoinObjectsQueryResult = await iotaGraphQLClient!.query({
                query: COIN_OBJECTS_QUERY,
                variables: {
                    type: coinType,
                    first: pageSize,
                    after: pageParam as string | null,
                },
            });
            const result = response.data?.coins;
            if (!result) return { coinObjects: [], nextCursor: null };

            // Owners' names come in this same query, so `AddressLink` doesn't
            // need one name request per row.
            for (const { owner } of result.nodes) {
                if (owner?.__typename !== 'AddressOwner' || !owner.owner) continue;
                setDefaultIotaNameQueryData(
                    queryClient,
                    owner.owner.address,
                    owner.owner.iotaNamesDefaultName,
                );
            }

            return {
                coinObjects: result.nodes.map(({ address, coinBalance, owner }) => ({
                    objectId: address,
                    balance: coinBalance ?? '0',
                    owner: toCoinObjectOwner(owner),
                })),
                nextCursor: result.pageInfo.hasNextPage
                    ? (result.pageInfo.endCursor ?? null)
                    : null,
            };
        },
        getNextPageParam: ({ nextCursor }) => nextCursor,
        enabled: !!iotaGraphQLClient,
        retry: false,
        staleTime: 30 * 1000,
    });
}
