// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import { type IotaObjectDataFilter } from '@iota/iota-sdk/client';
import { useQuery } from '@tanstack/react-query';
import { getFirstOwnedObjectsPage } from '../utils/getFirstOwnedObjectsPage';

/**
 * Fetches the first page of owned objects matching `filter` that holds at least one object, to
 * check whether such objects exist.
 */
export function useGetFirstOwnedObjectsPage(
    address: string | null | undefined,
    filter: IotaObjectDataFilter,
    limit: number,
) {
    const client = useIotaClient();
    return useQuery({
        queryKey: ['get-owned-objects', address, filter, limit, 'first-non-empty-page'],
        queryFn: () =>
            getFirstOwnedObjectsPage(client, {
                owner: address!,
                filter,
                options: {
                    showType: true,
                    showContent: true,
                    showDisplay: true,
                },
                limit,
            }),
        staleTime: 10 * 1000,
        enabled: !!address,
    });
}
