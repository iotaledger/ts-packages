// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type AuditTrailHandle, type OnChainAuditTrail, type Record } from '@iota/audit-trails/web';
import { useInfiniteQuery, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuditTrailClient } from '~/contexts';

// NOTE: These are placeholder types based on the specification.
// They will be replaced with the actual types from '@iota/audit-trail'.

type ListPageResponse = {
    records: Record[];
    cursor?: bigint;
};

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
        useInfiniteQuery<ListPageResponse>({
            queryKey: ['paginatedRecords', objectId, auditTrail, pageSize],
            queryFn: async ({ pageParam = 0n }) => {
                if (!auditTrail) {
                    return { records: [], cursor: undefined };
                }

                const response = await auditTrail.records().listPage(pageParam as bigint, pageSize);

                // This is a temporary hack because the wasm bindings do not return the correct type.
                // This should be removed once the bindings are fixed.
                return response as unknown as ListPageResponse;
            },
            initialPageParam: 0n,
            getNextPageParam: (lastPage) => lastPage.cursor,
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
