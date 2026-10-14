// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@iota/bcs';
import { bcs } from '@iota/bcs';

/**
 * The single-variant envelope `iota-sdk-grpc-types` puts around types that lack
 * a BCS discriminant of their own, so the bytes start with a `0x00` tag that
 * `bcs-schema.abnf` does not describe.
 */
export function versioned<const Name extends string, T extends BcsType<any>>(name: Name, v1: T) {
    return bcs.enum(`Versioned${name}`, { V1: v1 });
}
