// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export type CoinValuation =
    | { kind: 'market'; priceId: string }
    | { kind: 'peg'; currency: 'USD'; rate: number };
