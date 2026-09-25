// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { IotaGraphQLClient } from '@iota/iota-sdk/graphql';
import { IotaNamesClient } from '@iota/iota-names-sdk';
import { getNetwork } from '@iota/iota-sdk/client';
import { useMemo } from 'react';

import { useIotaClientContext } from './useIotaClient.js';

export function useIotaNamesClient() {
    const { network: networkId } = useIotaClientContext();
    const network = getNetwork(networkId);

    const iotaNamesClient = useMemo(() => {
        if (!network.graphql) return null;

        return new IotaNamesClient({
            graphQlClient: new IotaGraphQLClient({ url: network.graphql }),
            network: network.id,
        });
    }, [network.id, network.graphql]);

    return {
        iotaNamesClient,
        networkId: network.id,
        isSupported: !!iotaNamesClient?.config,
    };
}
