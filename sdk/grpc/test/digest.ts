// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@iota/bcs';
import { blake2b } from '@noble/hashes/blake2';

/** Rust's `type_digest`: Blake2b-256 over `"<Type>::"` followed by the BCS bytes. */
export function typeDigest(typeName: string, bcs: Uint8Array): string {
    const salt = new TextEncoder().encode(`${typeName}::`);
    return toBase58(blake2b(new Uint8Array([...salt, ...bcs]), { dkLen: 32 }));
}
