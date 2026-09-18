// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import { type NetworkMetrics } from '@iota/iota-sdk/src/client';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

type NetworkMetricsQueryOptions = {
    refetchInterval?: number;
    staleTime?: number;
};
export function useGetNetworkMetrics({
    staleTime = Infinity,
    refetchInterval,
}: NetworkMetricsQueryOptions = {}): UseQueryResult<NetworkMetrics, Error> {
    const client = useIotaClient();
    return useQuery<NetworkMetrics, Error>({
        queryKey: ['home', 'metrics'],
        queryFn: () => client.getNetworkMetrics(),
        gcTime: 24 * 60 * 60 * 1000,
        staleTime,
        refetchInterval,
        retry: 5,
    });
}
