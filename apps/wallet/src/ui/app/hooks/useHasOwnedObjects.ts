// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getFirstOwnedObjectsPage } from '@iota/core';
import { useIotaClient, useIotaClientContext } from '@iota/dapp-kit';
import { type IotaObjectDataFilter } from '@iota/iota-sdk/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Checks whether any of `addresses` owns an object matching `filter`.
 */
export function useHasOwnedObjects(addresses: string[], filter: IotaObjectDataFilter) {
    const client = useIotaClient();
    const { network } = useIotaClientContext();
    return useQuery({
        // The client can't be told apart in a key, so key on its network instead.
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['get-owned-objects', addresses, filter, 'has-objects', network],
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
