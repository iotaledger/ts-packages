// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    type AuditTrailHandle,
    type OnChainAuditTrail,
    type PaginatedRecord,
} from '@iota/audit-trails/web';
import {
    type InfiniteData,
    type QueryKey,
    useInfiniteQuery,
    useQuery,
    type UseQueryResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuditTrailClient } from '~/contexts';

/**
 * A React hook that resolves an Object ID to its corresponding Audit Trail document on chain.
 *
 * @param {string} objectId - The Object ID to resolve.
 * @returns a Audit Trail document on chain.
 */
export function useResolveOnChainAuditTrail(objectId: string): UseQueryResult<OnChainAuditTrail> {
    const auditTrailClient = useAuditTrailClient();
    return useQuery({
        queryKey: ['resolve-audit-trail', objectId],
        queryFn: async () => auditTrailClient?.trail(objectId).get(),
        enabled: !!auditTrailClient,
    });
}

/**
 * A React hook that resolves an Object ID to its corresponding Audit Trail document on chain.
 *
 * @param {string} objectId - The Object ID to resolve.
 * @returns a Audit Trail document on chain.
 */
export function useResolveAuditTrailHandle(objectId: string): UseQueryResult<AuditTrailHandle> {
    const auditTrailClient = useAuditTrailClient();
    return useQuery({
        queryKey: ['resolve-audit-trail-handle', objectId],
        queryFn: async () => auditTrailClient?.trail(objectId),
        enabled: !!auditTrailClient,
    });
}

type UsePaginatedAuditTrailRecordsParams = {
    objectId: string;
    auditTrail: AuditTrailHandle | null;
    pageSize: number;
};

export function usePaginatedAuditTrailRecords({
    objectId,
    auditTrail,
    pageSize,
}: UsePaginatedAuditTrailRecordsParams) {
    const { data, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isLoading } =
        useInfiniteQuery<
            PaginatedRecord,
            Error,
            InfiniteData<PaginatedRecord>,
            QueryKey,
            bigint | null
        >({
            queryKey: ['paginatedRecords', objectId, auditTrail, pageSize],
            queryFn: async ({ pageParam }) => {
                if (!auditTrail) {
                    throw new Error('Audit trail is not available');
                }

                return auditTrail.records().listPage(pageParam, pageSize);
            },
            initialPageParam: null,
            getNextPageParam: ({ hasNextPage, nextCursor }) => (hasNextPage ? nextCursor : null),
            enabled: Boolean(auditTrail),
        });

    const records = useMemo(() => data?.pages.flatMap((page) => page.records) ?? [], [data]);

    return {
        records,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        isLoading,
    };
}
