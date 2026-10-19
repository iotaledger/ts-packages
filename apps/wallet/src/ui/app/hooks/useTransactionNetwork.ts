// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getCustomNetwork } from '@iota/core';
import { getAllNetworks, getNetwork, Network, type ChainType } from '@iota/iota-sdk/client';
import { useAppSelector } from './useAppSelector';

export function useTransactionNetwork(chain?: ChainType) {
    const activeNetwork = useAppSelector((state) => state.app.network);
    const activeConfig =
        activeNetwork === Network.Custom ? getCustomNetwork() : getNetwork(activeNetwork);
    const requestedConfig = chain
        ? Object.values(getAllNetworks() ?? {}).find((network) => network.chain === chain)
        : undefined;

    return {
        transactionNetwork: requestedConfig ?? activeConfig,
        activeNetwork: activeConfig,
        isNetworkMismatch: !!requestedConfig && requestedConfig.chain !== activeConfig.chain,
    };
}
