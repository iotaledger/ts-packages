// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expectTypeOf, it } from 'vitest';

import {
    CheckpointResponseField,
    EpochField,
    epochAttribute,
    epochFeatureFlag,
    ObjectField,
    TransactionField,
} from '../../src/read-masks.js';

describe('field path types', () => {
    it('keeps each path as a literal', () => {
        expectTypeOf(ObjectField.BCS).toEqualTypeOf<'bcs'>();
        expectTypeOf(
            CheckpointResponseField.CHECKPOINT_SUMMARY_BCS,
        ).toEqualTypeOf<'checkpoint.summary.bcs'>();
    });

    it('scopes each namespace type to its own paths', () => {
        expectTypeOf(ObjectField.BCS).toExtend<ObjectField>();
        expectTypeOf(CheckpointResponseField.CHECKPOINT).not.toExtend<ObjectField>();
        expectTypeOf(TransactionField.EFFECTS).not.toExtend<ObjectField>();
    });

    it('does not accept an arbitrary string as a field', () => {
        expectTypeOf<string>().not.toExtend<ObjectField>();
    });

    it('accepts built protocol config paths as epoch fields', () => {
        expectTypeOf(epochFeatureFlag('enable_vdf')).toExtend<EpochField>();
        expectTypeOf(epochAttribute('max_tx_gas')).toExtend<EpochField>();
        expectTypeOf(EpochField.EPOCH).toExtend<EpochField>();
    });

    it('still rejects other strings as epoch fields', () => {
        expectTypeOf<string>().not.toExtend<EpochField>();
        expectTypeOf<'protocol_config.nope'>().not.toExtend<EpochField>();
        expectTypeOf(epochFeatureFlag('x')).not.toExtend<ObjectField>();
    });
});
