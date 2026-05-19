// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { mockCapabilities } from './mockCapabilities';

export const DEFAULT_CAPABILITIES_LIMIT = 10;

export enum CapabilityFilterValue {
    Issued = 'Issued',
    Revoked = 'Revoked',
}

export function useCapabilities(filter: CapabilityFilterValue, limit = DEFAULT_CAPABILITIES_LIMIT) {
    return useInfiniteQuery({
        queryKey: ['get-capabilities', filter, limit],
        queryFn: async ({ pageParam = 0 }) => {
            const allCapabilities = mockCapabilities.filter((c) => {
                if (filter === CapabilityFilterValue.Issued) {
                    return c.status !== 'revoked';
                }
                return c.status === 'revoked';
            });

            const start = pageParam * limit;
            const end = start + limit;
            const page = allCapabilities.slice(start, end);

            // Simulate network delay
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                data: page,
                nextCursor: allCapabilities.length > end ? pageParam + 1 : null,
                hasNextPage: allCapabilities.length > end,
            };
        },
        initialPageParam: 0,
        getNextPageParam: ({ hasNextPage, nextCursor }) => (hasNextPage ? nextCursor : null),
        staleTime: 10 * 1000,
        retry: false,
        placeholderData: keepPreviousData,
    });
}
