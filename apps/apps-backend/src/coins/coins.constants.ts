// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Network } from '@iota/iota-sdk/client';

/**
 * The networks whose coins are indexed. Requests for any other network get a 404.
 */
export const INDEXED_COIN_NETWORKS: Network[] = [Network.Mainnet, Network.Testnet, Network.Devnet];

export const DEFAULT_COINS_LIMIT = 20;
export const MAX_COINS_LIMIT = 100;

export const COINS_RETRY_INTERVAL_MS = 1000 * 60 * 5;

export const COINS_PER_PAGE = 50;
export const COIN_REQUEST_DELAY_MS = 200;
export const MAX_RETRIES = 5;
export const INITIAL_RETRY_DELAY_MS = 1000;
