// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClientContext } from '@iota/dapp-kit';
import { KioskClient } from '@iota/kiosk';
import { createContext, useMemo, type ReactNode } from 'react';
import { useIotaGraphQLClient } from '../../contexts';

export const KioskClientContext = createContext<KioskClient | null>(null);

export type KioskClientProviderProps = {
    children: ReactNode;
};

export function KioskClientProvider({ children }: KioskClientProviderProps) {
    const { client, network } = useIotaClientContext();
    const { iotaGraphQLClient } = useIotaGraphQLClient(network);
    const kioskClient = useMemo(
        () => new KioskClient({ client, network, graphQlClient: iotaGraphQLClient }),
        [client, network, iotaGraphQLClient],
    );
    return (
        <KioskClientContext.Provider value={kioskClient}>{children}</KioskClientContext.Provider>
    );
}
