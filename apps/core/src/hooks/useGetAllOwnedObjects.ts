// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import { IotaObjectData, type IotaObjectDataFilter } from '@iota/iota-sdk/client';
import { useQuery } from '@tanstack/react-query';

const MAX_OBJECTS_PER_REQ = 10;

export function useGetAllOwnedObjects(address: string, filter?: IotaObjectDataFilter) {
    const client = useIotaClient();
    return useQuery({
        queryKey: ['get-all-owned-objects', address, filter],
        queryFn: async () => {
            let cursor: string | undefined | null = null;
            let hasNextPage = true;
            const allData: IotaObjectData[] = [];
            // A page can be empty while more pages follow, so keep fetching until
            // there is no next page.
            while (hasNextPage) {
                const response = await client.getOwnedObjects({
                    owner: address,
                    filter,
                    options: {
                        showType: true,
                        showContent: true,
                        showDisplay: true,
                    },
                    limit: MAX_OBJECTS_PER_REQ,
                    cursor,
                });

                const mappedData = response.data
                    .map((object) => object?.data)
                    .filter((obj): obj is IotaObjectData => obj !== null && obj !== undefined);

                allData.push(...mappedData);
                cursor = response.nextCursor;
                hasNextPage = response.hasNextPage && !!cursor;
            }

            return allData;
        },
        staleTime: 10 * 1000,
        enabled: !!address,
    });
}
