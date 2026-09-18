import { getRpcUrl } from '@iota/iota-sdk/client';
import {
    DEVNET_COUNTER_PACKAGE_ID,
    TESTNET_COUNTER_PACKAGE_ID,
    MAINNET_COUNTER_PACKAGE_ID,
} from './constants.ts';
import { createNetworkConfig } from '@iota/dapp-kit';

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
    devnet: {
        url: getRpcUrl('devnet'),
        variables: {
            counterPackageId: DEVNET_COUNTER_PACKAGE_ID,
        },
    },
    testnet: {
        url: getRpcUrl('testnet'),
        variables: {
            counterPackageId: TESTNET_COUNTER_PACKAGE_ID,
        },
    },
    mainnet: {
        url: getRpcUrl('mainnet'),
        variables: {
            counterPackageId: MAINNET_COUNTER_PACKAGE_ID,
        },
    },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };
