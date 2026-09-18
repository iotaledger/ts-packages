// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type NetworkEnvType } from '@iota/core';
import { isValidUrl } from '_src/shared/utils';
import { getDefaultNetwork, Network } from '@iota/iota-sdk/client';
import mitt from 'mitt';
import Browser from 'webextension-polyfill';

type NetworkStoredValues = {
    network: Network;
    customRpc: string | null;
    customExplorer: string | null;
    customFaucet: string | null;
};

class NetworkEnv {
    #events = mitt<{ changed: NetworkEnvType }>();

    async getActiveNetwork(): Promise<NetworkEnvType> {
        const { network, customRpc, customExplorer, customFaucet } =
            await Browser.storage.local.get({
                network: getDefaultNetwork(),
                customRpc: null,
                customExplorer: null,
                customFaucet: null,
            } satisfies NetworkStoredValues);

        return {
            network,
            customRpcUrl: customRpc,
            customExplorerUrl: customExplorer,
            customFaucetUrl: customFaucet,
        } satisfies NetworkEnvType;
    }

    async setActiveNetwork(networkEnv: NetworkEnvType) {
        const { network, customRpcUrl } = networkEnv;
        if (network === Network.Custom && !isValidUrl(customRpcUrl)) {
            throw new Error(`Invalid custom RPC url ${customRpcUrl}`);
        }

        const networkValues = {
            network,
            customRpc: customRpcUrl,
            customExplorer: networkEnv.customExplorerUrl,
            customFaucet: networkEnv.customFaucetUrl,
        } satisfies NetworkStoredValues;

        await Browser.storage.local.set(networkValues);
        this.#events.emit('changed', networkEnv);
    }

    on = this.#events.on;

    off = this.#events.off;
}

const networkEnv = new NetworkEnv();
export default networkEnv;
