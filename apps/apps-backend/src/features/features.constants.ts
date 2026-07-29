// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Network } from '@iota/iota-sdk/client';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { RECOGNIZED_COIN_PACKAGES } from './coins.constants';

type FeatureEnabledByNetwork = Record<Network, boolean>;

export interface KnownAddress {
    name: string;
    logo?: string;
}

const KNOWN_LOGOS_BASE_URL = 'https://files.iota.org/media/tooling/logos';

export const ADDRESSES_ALIASES: Record<string, KnownAddress> = {
    '0x0': { name: 'IOTA System Account' },
    '0x1': { name: 'Move stdlib Package' },
    '0x2': { name: 'IOTA Framework Package' },
    '0x3': { name: 'IOTA System Package' },
    '0x5': { name: 'IOTA System Object' },
    '0x6': { name: 'IOTA System Clock' },
    '0x7': { name: 'IOTA Authenticator Object' },
    '0x8': { name: 'IOTA Randonmness Object' },
    '0x9': { name: 'Bridge Object' },
    '0x107a': { name: 'Stardust Package' },
    '0xb': { name: 'Bridge Package' },
    '0x403': { name: 'IOTA Denylist Object' },
    '0x7b4a34f6a011794f0ecbe5e5beb96102d3eef6122eb929b9f50a8d757bfbdd67': { name: 'IOTA EVM' },
    '0xbeb1ba753fd0bbc0f5470b3948345da6dc870c0421d809cfc3abe95b70f625a7': {
        name: 'Legacy Migrator',
    },
    '0x79e5f3492c39b6dc7c144d30846cd3fae894280d8e792a864111786c6901e1cb': {
        name: 'ApeDAO',
        logo: `${KNOWN_LOGOS_BASE_URL}/apedao.jpg`,
    },
    '0x5b8bc6d08c969775fea5bb15a712cbfad696cda1c6fb1354f4262f356dc40d7a': {
        name: 'Binance',
        logo: `${KNOWN_LOGOS_BASE_URL}/binance.jpg`,
    },
    '0x71bf9097f3403a37ef5b8795287692db98ba71850c8f95dee5ba53f7ab6ec3dc': {
        name: 'BitMart',
        logo: `${KNOWN_LOGOS_BASE_URL}/bitmart.jpg`,
    },
    '0x291b3142bc9df9f658cd96e2bdafa93f9948d0aca9baa99077ee630a6fe92c84': {
        name: 'Bitfinex',
        logo: `${KNOWN_LOGOS_BASE_URL}/bitfinex.png`,
    },
    '0x62f36b79d7ea8ae189491854edd9318b29c75346792177b230a95f333ffa53ad': {
        name: 'Gate.io',
        logo: `${KNOWN_LOGOS_BASE_URL}/gate.jpg`,
    },
    '0x96af1639b31210ff22641fb2e19085a4fae0a5c6d8a282b9452208427cd04f9f': {
        name: 'KuCoin',
        logo: `${KNOWN_LOGOS_BASE_URL}/kucoin.jpg`,
    },
    '0xc2e0c96a5d1139af04516650328b4b087522c1f6c2d51f665a45967d4c2caee1': {
        name: 'KuCoin',
        logo: `${KNOWN_LOGOS_BASE_URL}/kucoin.jpg`,
    },
    '0x2ab07ce8498aa3c556fc1dbcbbba8ce40bcec7296e2aafbe5832592db046e9bd': {
        name: 'OKX',
        logo: `${KNOWN_LOGOS_BASE_URL}/okx.jpg`,
    },
    '0x32bc9471570ca24fcd1fe5b201ea6894748aa0ddd44d20c68f1a4f99db513aa2': {
        name: 'IOTA Testnet Faucet',
    },
    '0x7d307e5537bf0ebd7417f0aa2b09562e5be2a3b1bc0df39ecba8df606c6002b9': {
        name: 'Staketab x Iotascan',
    },
    '0x5b45067591bd332447ec0ff190594060bf461c5619cf3ed933bd13b91d2b6bf3': {
        name: 'TWIN Gas Station',
        logo: `${KNOWN_LOGOS_BASE_URL}/twin.png`,
    },
};

export const KNOWN_ADDRESSES_ALIASES = Object.fromEntries(
    Object.entries(ADDRESSES_ALIASES).map(([address, alias]) => [
        normalizeIotaAddress(address),
        alias,
    ]),
);

export const NAME_ADDRESS_RESOLUTION_FEATURE: FeatureEnabledByNetwork = {
    [Network.Mainnet]: true,
    [Network.Testnet]: true,
    [Network.Devnet]: true,
    [Network.Localnet]: true,
    [Network.Custom]: true,
};

export const RECOGNIZED_PACKAGES = [
    '0x2',
    '0x3',
    '0x1',
    '0x107a',
    '0x0000000000000000000000000000000000000000000000000000000000000002',
    '0x0000000000000000000000000000000000000000000000000000000000000003',
    '0x0000000000000000000000000000000000000000000000000000000000000001',
    '0x000000000000000000000000000000000000000000000000000000000000107a',
    ...RECOGNIZED_COIN_PACKAGES.map((coin) => coin.type.split('::')[0]),
];
