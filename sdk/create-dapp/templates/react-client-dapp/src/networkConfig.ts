import { getRpcUrl } from '@iota/iota-sdk/client';
import { createNetworkConfig } from '@iota/dapp-kit';

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
    devnet: {
        url: getRpcUrl('devnet'),
    },
    testnet: {
        url: getRpcUrl('testnet'),
    },
    mainnet: {
        url: getRpcUrl('mainnet'),
    },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };
