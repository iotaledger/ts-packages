// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getFirstOwnedObjectsPage } from '@iota/core';
import { useIotaClient } from '@iota/dapp-kit';
import { type IotaObjectDataFilter } from '@iota/iota-sdk/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Checks whether any of `addresses` owns an object matching `filter`.
 */
export function useHasOwnedObjects(addresses: string[], filter: IotaObjectDataFilter) {
    const client = useIotaClient();
    return useQuery({
        queryKey: ['get-owned-objects', addresses, filter, 'has-objects'],
        queryFn: async () => {
            try {
                const pages = await Promise.all(
                    addresses.map((address) =>
                        getFirstOwnedObjectsPage(client, { owner: address, filter, limit: 1 }),
                    ),
                );
                return pages.some((page) => page.data.length > 0);
            } catch (error) {
                return false;
            }
        },
        staleTime: 10 * 1000,
        enabled: addresses.length > 0,
    });
}
