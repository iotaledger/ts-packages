// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import { type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

export function useGetTransaction(
    transactionId: string,
    queryOptions?: {
        retry?: number;
        initialData?: IotaTransactionBlockResponse;
        showRawInput?: boolean;
    },
): UseQueryResult<IotaTransactionBlockResponse, Error> {
    const client = useIotaClient();
    const showRawInput = !!queryOptions?.showRawInput;
    return useQuery<IotaTransactionBlockResponse, Error>({
        queryKey: ['transactions-by-id', transactionId, { showRawInput }],
        queryFn: async () =>
            client.getTransactionBlock({
                digest: transactionId,
                options: {
                    showInput: true,
                    showEffects: true,
                    showEvents: true,
                    showBalanceChanges: true,
                    showObjectChanges: true,
                    showRawInput,
                },
            }),
        enabled: !!transactionId,
        retry: queryOptions?.retry,
        initialData: queryOptions?.initialData,
    });
}
