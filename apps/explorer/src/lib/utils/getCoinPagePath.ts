// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getInternalPath } from './getInternalPath';
import { toCoinType } from './toCoinType';

export function getCoinPagePath(coinType: string): string {
    // The chain writes the same coin type in several spellings, down to a space
    // between type arguments, so the link cannot carry the one it handed us.
    return getInternalPath('coin', toCoinType(coinType) ?? coinType);
}
