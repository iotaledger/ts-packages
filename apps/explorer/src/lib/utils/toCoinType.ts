// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { tryParseStructTag } from '@iota/core';
import { normalizeStructTag } from '@iota/iota-sdk/utils';

/**
 * Normalizes a `package::module::Name` coin type, or returns null when it is not one.
 */
export function toCoinType(value: string): string | null {
    if (value.split('::').length < 3) return null;

    const tag = tryParseStructTag(value);

    return tag ? normalizeStructTag(tag) : null;
}
