// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinSource } from './coins.types';

export const DEFAULT_COINS_LIMIT = 20;
export const MAX_COINS_LIMIT = 100;

export const COINS_RETRY_INTERVAL_MS = 1000 * 60 * 5;

export const COINS_PER_PAGE = 50;
export const MAX_RPC_BATCH_SIZE = 50;
export const COIN_REQUEST_DELAY_MS = 200;
export const MAX_RETRIES = 5;
export const INITIAL_RETRY_DELAY_MS = 1000;

export const COIN_OBJECT_TYPES: Record<CoinSource, string> = {
    metadata: '0x2::coin::CoinMetadata',
    manager: '0x2::coin_manager::CoinManager',
};
