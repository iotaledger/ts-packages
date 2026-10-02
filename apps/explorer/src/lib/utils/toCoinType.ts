// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { normalizeStructTag } from '@iota/iota-sdk/utils';

/**
 * Normalizes a `package::module::Name` coin type, or returns null when it is not one.
 */
export function toCoinType(value: string): string | null {
    if (value.split('::').length < 3) return null;
    try {
        return normalizeStructTag(value);
    } catch {
        return null;
    }
}
