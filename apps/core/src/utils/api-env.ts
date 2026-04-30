// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    getDefaultNetwork,
    getNetwork,
    Network,
    type NetworkConfiguration,
} from '@iota/iota-sdk/client';

type KnownNetworkValues = {
    customRpcUrl: null;
    customExplorerUrl: null;
    customFaucetUrl: null;
};

type CustomNetworkValues = {
    customRpcUrl: string;
    customExplorerUrl: string | null;
    customFaucetUrl: string | null;
};

export type NetworkEnvType =
    | ({ network: Exclude<Network, Network.Custom> } & KnownNetworkValues)
    | ({ network: Network.Custom } & CustomNetworkValues);

export function getCustomNetwork(rpc: string = ''): NetworkConfiguration {
    return {
        name: 'Custom RPC',
        id: Network.Custom,
        url: rpc,
        chain: 'iota:unknown',
        explorer: getNetwork(getDefaultNetwork()).explorer,
    };
}
