// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

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
