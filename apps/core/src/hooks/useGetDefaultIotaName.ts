// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaNamesClient } from '../contexts';
import { type QueryClient, useQuery } from '@tanstack/react-query';
import { normalizeIotaName } from '@iota/iota-names-sdk';

export function getDefaultIotaNameQueryKey(
    address: string | null | undefined,
    normalized: boolean = true,
) {
    return ['iota-name', 'default-name', address, normalized] as const;
}

/**
 * Stores an address' default IOTA name where `useGetDefaultIotaName` reads it,
 * for callers that already got the name in a bigger query and want to avoid
 * one name request per address.
 */
export function setDefaultIotaNameQueryData(
    queryClient: QueryClient,
    address: string,
    name: string | null | undefined,
): void {
    queryClient.setQueryData(
        getDefaultIotaNameQueryKey(address),
        name ? normalizeIotaName(name) : null,
    );
}

export function useGetDefaultIotaName(
    address: string | null | undefined,
    normalized: boolean = true,
) {
    const { iotaNamesClient } = useIotaNamesClient();

    return useQuery({
        queryKey: getDefaultIotaNameQueryKey(address, normalized),
        queryFn: async () => {
            if (!address) return null;

            const defaultName = await iotaNamesClient?.getPublicName(address);

            if (!defaultName) return null;

            return normalized ? normalizeIotaName(defaultName) : defaultName;
        },
        enabled: !!iotaNamesClient && !!address,
        staleTime: 1000 * 60 * 5,
    });
}
