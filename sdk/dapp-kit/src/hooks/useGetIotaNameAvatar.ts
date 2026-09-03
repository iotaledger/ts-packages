// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getNetwork } from '@iota/iota-sdk/client';
import { IotaGraphQLClient } from '@iota/iota-sdk/graphql';
import { IotaNamesClient } from '@iota/iota-names-sdk';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useIotaClient, useIotaClientContext } from './useIotaClient.js';

export function useGetIotaNameAvatar(
    address: string | null | undefined,
    iotaNamesEnabled: boolean,
) {
    const iotaContext = useIotaClientContext();
    const client = useIotaClient();
    const network = getNetwork(iotaContext.network);

    const iotaNamesClient = useMemo(() => {
        const iotaGraphQLClient = new IotaGraphQLClient({
            url: network.graphql!,
        });

        return new IotaNamesClient({
            graphQlClient: iotaGraphQLClient,
            network: network.id,
        });
    }, [network.id]);

    const iotaNamesSupported = !!iotaNamesClient.config;

    return useQuery({
        queryKey: ['iota-name', 'avatar', address, network.id],
        queryFn: async () => {
            if (!address) return null;

            const defaultName = await iotaNamesClient.getPublicName(address);
            if (!defaultName) return null;

            const nameRecord = await iotaNamesClient.getNameRecord(defaultName);
            if (!nameRecord) return null;

            const objectId = nameRecord.avatar ?? nameRecord.nftId;
            if (!objectId) return null;

            const objectResponse = await client.getObject({
                id: objectId,
                options: { showDisplay: true },
            });

            return objectResponse?.data?.display?.data?.image_url ?? null;
        },
        enabled: iotaNamesEnabled && iotaNamesSupported && !!address,
        staleTime: 1000 * 60 * 5,
    });
}
