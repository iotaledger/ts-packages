// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type AuditTrailHandle, type PaginatedRecord } from '@iota/audit-trails/web';
import {
    type InfiniteData,
    type QueryKey,
    useInfiniteQuery,
    useQuery,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuditTrailClient } from '~/contexts';

export function useResolveOnChainAuditTrail(objectId: string) {
    const { client } = useAuditTrailClient();
    return useQuery({
        queryKey: ['resolve-audit-trail', objectId],
        queryFn: async () => client?.trail(objectId).get(),
        enabled: !!client,
    });
}

export function useResolveAuditTrailHandle(objectId: string) {
    const { client } = useAuditTrailClient();
    return useQuery({
        queryKey: ['resolve-audit-trail-handle', objectId],
        queryFn: async () => client?.trail(objectId),
        enabled: !!client,
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
