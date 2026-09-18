// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { normalizeIotaName } from '@iota/iota-names-sdk';
import { useQuery } from '@tanstack/react-query';

import { useIotaNamesClient } from './useIotaNamesClient.js';

export function useGetDefaultIotaName(
    address: string | null | undefined,
    iotaNamesEnabled: boolean,
) {
    const { iotaNamesClient, networkId, isSupported } = useIotaNamesClient();

    return useQuery({
        queryKey: ['iota-name', 'default-name', address, networkId],
        queryFn: async () => {
            if (!address) return null;

            const name = await iotaNamesClient?.getPublicName(address);

            return name ? normalizeIotaName(name) : name;
        },
        enabled: !!address && iotaNamesEnabled && isSupported,
        staleTime: 1000 * 60 * 10,
    });
}
