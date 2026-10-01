// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@iota/bcs';
import { bcs } from '@iota/iota-sdk/bcs';

import { versioned } from './versioned.js';

export const ValidatorAggregatedSignature = bcs.struct('ValidatorAggregatedSignature', {
    epoch: bcs.u64(),
    signature: bcs.bytes(48),
    bitmap: bcs.byteVector(),
});

export type ValidatorAggregatedSignature = typeof ValidatorAggregatedSignature.$inferType;

export const VersionedValidatorAggregatedSignature = versioned(
    'ValidatorAggregatedSignature',
    ValidatorAggregatedSignature,
);

export const UserSignature = bcs.byteVector().transform({
    input: (value: string | Uint8Array) => (typeof value === 'string' ? fromBase64(value) : value),
    output: (value) => toBase64(value),
});
