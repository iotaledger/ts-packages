// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useMemo, useState } from 'react';
import type { TablePaginationOptions } from '@iota/apps-ui-kit';

interface UseLocalTablePaginationResult<T> {
    pageData: T[];
    limit: number;
    setLimit: (limit: number) => void;
    resetPage: () => void;
    paginationOptions?: TablePaginationOptions;
    supportingLabel?: string;
}

/** Client-side pagination for data that is already fully loaded (no server-side cursor). */
export function useLocalTablePagination<T>(
    data: T[],
    defaultLimit: number,
): UseLocalTablePaginationResult<T> {
    const [limit, setLimit] = useState(defaultLimit);
    const [pageIndex, setPageIndex] = useState(0);

    const totalCount = data.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const currentPage = Math.min(pageIndex, totalPages - 1);

    const pageData = useMemo(
        () => data.slice(currentPage * limit, currentPage * limit + limit),
        [data, currentPage, limit],
    );

    const resetPage = useCallback(() => setPageIndex(0), []);

    function updateLimit(newLimit: number) {
        setLimit(newLimit);
        setPageIndex(0);
    }

    if (totalCount <= limit) {
        return { pageData, limit, setLimit: updateLimit, resetPage };
    }

    const start = currentPage * limit + 1;
    const end = Math.min(totalCount, start + limit - 1);

    return {
        pageData,
        limit,
        setLimit: updateLimit,
        resetPage,
        supportingLabel: `Showing ${start}-${end} out of ${totalCount}`,
        paginationOptions: {
            onFirst: () => setPageIndex(0),
            onPrev: () => setPageIndex((page) => Math.max(0, page - 1)),
            onNext: () => setPageIndex((page) => Math.min(totalPages - 1, page + 1)),
            onLast: () => setPageIndex(totalPages - 1),
            hasFirst: currentPage > 0,
            hasPrev: currentPage > 0,
            hasNext: currentPage < totalPages - 1,
            hasLast: currentPage < totalPages - 1,
        },
    };
}
