// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { CheckpointSchema } from '../../src/proto/iota/grpc/v1/checkpoint_pb.js';
import { DynamicFieldSchema } from '../../src/proto/iota/grpc/v1/dynamic_field_pb.js';
import { EpochSchema } from '../../src/proto/iota/grpc/v1/epoch_pb.js';
import { EventSchema } from '../../src/proto/iota/grpc/v1/event_pb.js';
import { GetServiceInfoResponseSchema } from '../../src/proto/iota/grpc/v1/ledger_service_pb.js';
import { ObjectSchema } from '../../src/proto/iota/grpc/v1/object_pb.js';
import {
    SimulatedTransactionSchema,
    ViewFunctionCallOutputsSchema,
} from '../../src/proto/iota/grpc/v1/transaction_execution_service_pb.js';
import { ExecutedTransactionSchema } from '../../src/proto/iota/grpc/v1/transaction_pb.js';
import {
    CheckpointResponseField,
    DEFAULT_READ_MASKS,
    DynamicFieldField,
    EpochField,
    epochAttribute,
    epochFeatureFlag,
    mergeReadMasks,
    normalizeReadMask,
    ObjectField,
    OwnedObjectField,
    ServiceInfoField,
    SimulateField,
    toReadMask,
    TransactionField,
    ViewFunctionCallField,
} from '../../src/read-masks.js';
import type { ReadMaskTarget } from '../read-mask-schema.js';
import { findInvalidReadMaskPath } from '../read-mask-schema.js';

/** The root `iota-grpc-server` validates `GetCheckpoint` / `StreamCheckpoints` masks against. */
const CHECKPOINT_DATA_RESPONSE: ReadMaskTarget = {
    checkpoint: CheckpointSchema,
    transactions: ExecutedTransactionSchema,
    events: EventSchema,
};

/** Each namespace against the message the server validates it against. */
const NAMESPACES: [string, Record<string, string>, ReadMaskTarget][] = [
    ['ObjectField', ObjectField, ObjectSchema],
    ['OwnedObjectField', OwnedObjectField, ObjectSchema],
    ['TransactionField', TransactionField, ExecutedTransactionSchema],
    ['ServiceInfoField', ServiceInfoField, GetServiceInfoResponseSchema],
    ['EpochField', EpochField, EpochSchema],
    ['CheckpointResponseField', CheckpointResponseField, CHECKPOINT_DATA_RESPONSE],
    ['SimulateField', SimulateField, SimulatedTransactionSchema],
    ['ViewFunctionCallField', ViewFunctionCallField, ViewFunctionCallOutputsSchema],
    ['DynamicFieldField', DynamicFieldField, DynamicFieldSchema],
];

const DEFAULT_TARGETS: Record<keyof typeof DEFAULT_READ_MASKS, ReadMaskTarget> = {
    getServiceInfo: GetServiceInfoResponseSchema,
    getEpoch: EpochSchema,
    getObjects: ObjectSchema,
    getTransactions: ExecutedTransactionSchema,
    getCheckpoint: CHECKPOINT_DATA_RESPONSE,
    listOwnedObjects: ObjectSchema,
    listDynamicFields: DynamicFieldSchema,
    executeTransactions: ExecutedTransactionSchema,
    simulateTransactions: SimulatedTransactionSchema,
    viewFunctionCalls: ViewFunctionCallOutputsSchema,
};

const sorted = (paths: readonly string[]) => [...paths].sort();

describe('normalizeReadMask', () => {
    it('drops a path its ancestor already selects, in either order', () => {
        expect(normalizeReadMask(['effects', 'effects.bcs'])).toEqual(['effects']);
        expect(normalizeReadMask(['effects.bcs', 'effects'])).toEqual(['effects']);
    });

    it('keeps unrelated paths', () => {
        expect(sorted(normalizeReadMask(['a', 'b.c', 'b']))).toEqual(['a', 'b']);
    });

    it('only treats whole segments as ancestors', () => {
        expect(sorted(normalizeReadMask(['effects', 'effects_bcs']))).toEqual([
            'effects',
            'effects_bcs',
        ]);
    });

    it('removes duplicates and empty paths', () => {
        expect(normalizeReadMask(['bcs', '', 'bcs'])).toEqual(['bcs']);
    });

    it('collapses to the wildcard when one is present', () => {
        expect(normalizeReadMask(['reference', '*', 'bcs'])).toEqual(['*']);
    });

    it('does not mutate its input', () => {
        const input = ['effects.bcs', 'effects'];
        normalizeReadMask(input);
        expect(input).toEqual(['effects.bcs', 'effects']);
    });
});

describe('mergeReadMasks', () => {
    it('unions masks', () => {
        expect(sorted(mergeReadMasks(['checkpoint.summary'], ['checkpoint.contents']))).toEqual([
            'checkpoint.contents',
            'checkpoint.summary',
        ]);
    });

    it('normalizes across masks', () => {
        expect(mergeReadMasks(['effects'], ['effects.bcs', 'effects'])).toEqual(['effects']);
    });

    it('merges defaults with extra fields', () => {
        const merged = mergeReadMasks(DEFAULT_READ_MASKS.getObjects, [
            ObjectField.REFERENCE_VERSION,
        ]);
        expect(sorted(merged)).toEqual(['bcs', 'reference']);
    });
});

describe('toReadMask', () => {
    it('falls back to the default when no mask is given', () => {
        const mask = toReadMask(undefined, DEFAULT_READ_MASKS.getObjects);
        expect(sorted(mask.paths)).toEqual(['bcs', 'reference']);
    });

    it('accepts a single field', () => {
        expect(toReadMask(ObjectField.BCS, DEFAULT_READ_MASKS.getObjects).paths).toEqual(['bcs']);
    });

    it('splits a comma-separated string into paths', () => {
        const mask = toReadMask('bcs,reference,', DEFAULT_READ_MASKS.getObjects);
        expect(sorted(mask.paths)).toEqual(['bcs', 'reference']);
    });

    it('normalizes a list of fields', () => {
        const mask = toReadMask(
            [ObjectField.REFERENCE, ObjectField.REFERENCE_OBJECT_ID, ObjectField.BCS],
            DEFAULT_READ_MASKS.getObjects,
        );
        expect(sorted(mask.paths)).toEqual(['bcs', 'reference']);
    });

    it('sends an empty list as an empty mask, which selects nothing', () => {
        expect(toReadMask([], DEFAULT_READ_MASKS.getObjects).paths).toEqual([]);
    });

    it('builds a real google.protobuf.FieldMask', () => {
        expect(toReadMask(ObjectField.BCS, DEFAULT_READ_MASKS.getObjects).$typeName).toBe(
            'google.protobuf.FieldMask',
        );
    });
});

describe('field paths', () => {
    it('match the Rust SDK names', () => {
        expect(ObjectField.ALL).toBe('*');
        expect(ObjectField.REFERENCE_OBJECT_ID).toBe('reference.object_id');
        expect(TransactionField.EVENTS_EVENTS_BCS).toBe('events.events.bcs');
        expect(TransactionField.BALANCE_CHANGES_AMOUNT).toBe('balance_changes.amount');
        expect(ServiceInfoField.EXECUTED_CHECKPOINT_HEIGHT).toBe('executed_checkpoint_height');
        expect(EpochField.PROTOCOL_CONFIG_PROTOCOL_VERSION).toBe(
            'protocol_config.protocol_version',
        );
        expect(CheckpointResponseField.CHECKPOINT_SUMMARY_BCS).toBe('checkpoint.summary.bcs');
        expect(SimulateField.EXECUTION_RESULT_EXECUTION_ERROR_BCS_KIND).toBe(
            'execution_result.execution_error.bcs_kind',
        );
        expect(DynamicFieldField.CHILD_OBJECT).toBe('child_object');
    });

    it('build protocol config keys', () => {
        expect(epochFeatureFlag('enable_vdf')).toBe('protocol_config.feature_flags.enable_vdf');
        expect(epochAttribute('max_tx_gas')).toBe('protocol_config.attributes.max_tx_gas');
    });

    describe.each(NAMESPACES)('%s', (_name, namespace, target) => {
        it('has a wildcard', () => {
            expect(namespace.ALL).toBe('*');
        });

        it.each(Object.entries(namespace))('%s resolves against the target message', (_, path) => {
            expect(findInvalidReadMaskPath(target, [path])).toBeUndefined();
        });
    });

    it('protocol config keys resolve against Epoch', () => {
        expect(
            findInvalidReadMaskPath(EpochSchema, [
                epochFeatureFlag('enable_vdf'),
                epochAttribute('max_tx_gas'),
            ]),
        ).toBeUndefined();
    });
});

describe('DEFAULT_READ_MASKS', () => {
    it.each(Object.entries(DEFAULT_TARGETS))('%s resolves against its target', (key, target) => {
        const mask = DEFAULT_READ_MASKS[key as keyof typeof DEFAULT_READ_MASKS];
        expect(mask.length).toBeGreaterThan(0);
        expect(findInvalidReadMaskPath(target, mask)).toBeUndefined();
    });

    it('covers every read-mask endpoint', () => {
        expect(sorted(Object.keys(DEFAULT_READ_MASKS))).toEqual(
            sorted(Object.keys(DEFAULT_TARGETS)),
        );
    });

    it('execute includes effects, getTransactions does not', () => {
        expect(DEFAULT_READ_MASKS.executeTransactions).toContain('effects');
        expect(DEFAULT_READ_MASKS.getTransactions).not.toContain('effects');
    });

    it('viewFunctionCalls names the oneof, so a failed call still returns its error', () => {
        expect(DEFAULT_READ_MASKS.viewFunctionCalls).toEqual(['execution_result']);
    });
});

describe('findInvalidReadMaskPath', () => {
    it('rejects a field the message does not have', () => {
        expect(findInvalidReadMaskPath(GetServiceInfoResponseSchema, ['checkpoint_height'])).toBe(
            'checkpoint_height',
        );
        expect(findInvalidReadMaskPath(ObjectSchema, ['reference.nope'])).toBe('reference.nope');
    });

    it('rejects a path below a scalar', () => {
        expect(findInvalidReadMaskPath(ObjectSchema, ['reference.version.x'])).toBe(
            'reference.version.x',
        );
    });

    it('rejects the response-level name, since view masks apply per item', () => {
        expect(
            findInvalidReadMaskPath(ViewFunctionCallOutputsSchema, ['view_function_call_results']),
        ).toBe('view_function_call_results');
    });

    it('accepts a root oneof as a parent', () => {
        expect(
            findInvalidReadMaskPath(SimulatedTransactionSchema, [
                'execution_result',
                'execution_result.command_results',
            ]),
        ).toBeUndefined();
    });

    it('rejects an unknown frame kind on the checkpoint root', () => {
        expect(findInvalidReadMaskPath(CHECKPOINT_DATA_RESPONSE, ['progress'])).toBe('progress');
    });
});
