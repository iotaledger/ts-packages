// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaGraphQLClientContext } from '@iota/core';
import { useIotaClient } from '@iota/dapp-kit';
import { graphql } from '@iota/iota-sdk/graphql/schemas/2025.2';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

export interface PackageVersion {
    address: string;
    version: number;
    /** The transaction that published this version, when it is still available. */
    previousTransaction?: string;
}

const PACKAGE_VERSIONS_QUERY = graphql(`
    query getPackageVersions($address: IotaAddress!, $first: Int!, $after: String) {
        packageVersions(address: $address, first: $first, after: $after) {
            pageInfo {
                hasNextPage
                endCursor
            }
            nodes {
                address
                version
            }
        }
    }
`);

interface PackageVersionsQueryResult {
    data?: {
        packageVersions: {
            pageInfo: { hasNextPage: boolean; endCursor?: string | null };
            nodes: { address: string; version: string | number }[];
        } | null;
    } | null;
}

const PAGE_SIZE = 50;
// A package upgraded more times than this is far past the point where a list is
// the right way to look at it.
const MAX_PAGES = 4;

/**
 * Every published version of a package, oldest first. Each upgrade lives at its
 * own address, so this is the only way to reach the earlier ones.
 */
export function usePackageVersions(
    packageId?: string | null,
): UseQueryResult<PackageVersion[], Error> {
    const { iotaGraphQLClient } = useIotaGraphQLClientContext();
    const client = useIotaClient();

    return useQuery<PackageVersion[], Error>({
        queryKey: ['package-versions', packageId],
        queryFn: async () => {
            const versions: PackageVersion[] = [];
            let cursor: string | null = null;

            for (let page = 0; page < MAX_PAGES; page++) {
                const response: PackageVersionsQueryResult = await iotaGraphQLClient!.query({
                    query: PACKAGE_VERSIONS_QUERY,
                    variables: { address: packageId!, first: PAGE_SIZE, after: cursor },
                });

                const result = response.data?.packageVersions;
                if (!result) break;

                versions.push(
                    ...result.nodes.map(({ address, version }) => ({
                        address,
                        version: Number(version),
                    })),
                );

                if (!result.pageInfo.hasNextPage) break;
                cursor = result.pageInfo.endCursor ?? null;
            }

            // GraphQL does not resolve the publishing transaction for past
            // versions, so they are filled in with a single batched RPC call.
            if (versions.length > 1) {
                const objects = await client.multiGetObjects({
                    ids: versions.map(({ address }) => address),
                    options: { showPreviousTransaction: true },
                });

                objects.forEach((object, index) => {
                    const previousTransaction = object.data?.previousTransaction;
                    if (previousTransaction) {
                        versions[index].previousTransaction = previousTransaction;
                    }
                });
            }

            return versions.sort((a, b) => a.version - b.version);
        },
        enabled: !!packageId && !!iotaGraphQLClient,
        staleTime: 5 * 60 * 1000,
    });
}
