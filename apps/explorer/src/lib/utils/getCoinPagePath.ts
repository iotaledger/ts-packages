// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getInternalPath } from './getInternalPath';

export function getCoinPagePath(coinType: string): string {
    return getInternalPath('coin', coinType);
}
