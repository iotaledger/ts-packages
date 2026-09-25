// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { CoinRegistryEntry } from '../interfaces';
import { CoinTrust } from '../enums';

export const COINS_QUERY_REFETCH_INTERVAL = 20_000;
export const COINS_QUERY_STALE_TIME = 20_000;
export const COIN_TYPE = '0x2::coin::Coin';

export const COIN_REGISTRY: CoinRegistryEntry[] = [
    {
        coinType: IOTA_TYPE_ARG,
        name: 'IOTA',
        trust: CoinTrust.Native,
        valuation: { kind: 'market', priceId: 'iota' },
    },
    {
        coinType: '0x1ec64aa5356180866521292ebefb778a16e2852380ff6425784ebc62fc98463f::cyb::CYB',
        name: 'CYB',
        trust: CoinTrust.Recognized,
    },
    {
        coinType: '0x206501fb7068b78c2fe3c827a019a6490c9b2aa3dbcd80071b7813e7d56a05c7::spam::SPAM',
        name: 'SPAM',
        trust: CoinTrust.Recognized,
    },
    {
        coinType:
            '0xcb9bb938865bdfbb3b9b841279eab1ba793ef8846de68d30fb45c32ef5b78ab4::spec_coin::SPEC_COIN',
        name: 'Speculation Coin',
        trust: CoinTrust.Recognized,
    },
    {
        coinType: '0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT',
        name: 'Staked IOTA',
        trust: CoinTrust.Recognized,
    },
    {
        coinType:
            '0xb63c04714082f9edb86b4b8fd07f89f0afebb9e6a96dd1a360a810e17691b674::tln_token::TLN_TOKEN',
        name: 'TokenLabs',
        trust: CoinTrust.Recognized,
    },
    {
        coinType: '0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD',
        name: 'Virtue USD',
        trust: CoinTrust.Recognized,
    },
];
