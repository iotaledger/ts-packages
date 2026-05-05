// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { useIotaClientContext } from '@iota/dapp-kit';
import { createSentryRequestInspector } from '@iota/core';
import { IotaNamesClient } from '@iota/iota-names-sdk';
import { getNetwork, Network } from '@iota/iota-sdk/client';
import { IotaGraphQLClient } from '@iota/iota-sdk/graphql';
import React, { createContext, useContext, useMemo } from 'react';

export const IotaNamesClientProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const ctx = useIotaClientContext();
    const network = getNetwork(ctx.network);

    const iotaNamesClient = useMemo(() => {
        return new IotaNamesClient({
            graphQlClient: new IotaGraphQLClient({
                url: network.graphql!,
                inspector:
                    network.id === Network.Mainnet
                        ? createSentryRequestInspector(network.graphql!)
                        : undefined,
            }),
            network: network.id,
        });
    }, [network.graphql, network.id]);

    return (
        <IotaNamesClientContext.Provider value={{ iotaNamesClient }}>
            {children}
        </IotaNamesClientContext.Provider>
    );
};

type IotaNamesClientContextType = {
    iotaNamesClient: IotaNamesClient;
};

export const IotaNamesClientContext = createContext<IotaNamesClientContextType | null>(null);

export function useIotaNamesClient(): IotaNamesClientContextType {
    const context = useContext(IotaNamesClientContext);

    if (!context) {
        throw new Error('useIotaNamesClient must be used within a IotaNamesClientProvider');
    }

    return context;
}
