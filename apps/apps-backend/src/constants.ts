// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { MARKET_PRICE_IDS } from './features/coins.constants';

export const tokenPriceKey = (coinName: string) => `tokenPrice${coinName}`;
export const TOKEN_PRICE_CURRENCY = 'usd';
export const TOKEN_PRICE_COINS = MARKET_PRICE_IDS;
