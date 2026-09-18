// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

module view_test::view_test;

use iota::coin::{Self, Coin};

#[view]
public fun coin_value<T>(coin: &Coin<T>): u64 {
    coin::value(coin)
}
