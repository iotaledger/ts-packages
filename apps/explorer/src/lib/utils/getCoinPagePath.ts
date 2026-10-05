// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export function getCoinPagePath(coinType: string): string {
    return `/coin/${encodeURI(coinType)}`;
}
