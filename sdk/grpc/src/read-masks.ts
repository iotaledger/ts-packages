// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { create } from '@bufbuild/protobuf';
import type { FieldMask } from '@bufbuild/protobuf/wkt';
import { FieldMaskSchema } from '@bufbuild/protobuf/wkt';

/** Read mask paths for `getObjects`. */
export const ObjectField = {
    /** Wildcard: every field. */
    ALL: '*',
    /** Object reference (object_id, version, digest). */
    REFERENCE: 'reference',
    /** The object ID. */
    REFERENCE_OBJECT_ID: 'reference.object_id',
    /** The object version. */
    REFERENCE_VERSION: 'reference.version',
    /** The object content digest. */
    REFERENCE_DIGEST: 'reference.digest',
    /** The full BCS-encoded object. */
    BCS: 'bcs',
} as const;

export type ObjectField = (typeof ObjectField)[keyof typeof ObjectField];

/** Read mask paths for `listOwnedObjects`. */
export const OwnedObjectField = {
    /** Wildcard: every field. */
    ALL: '*',
    /** Object reference (object_id, version, digest). */
    REFERENCE: 'reference',
    /** The object ID. */
    REFERENCE_OBJECT_ID: 'reference.object_id',
    /** The object version. */
    REFERENCE_VERSION: 'reference.version',
    /** The object content digest. */
    REFERENCE_DIGEST: 'reference.digest',
    /** The full BCS-encoded object. */
    BCS: 'bcs',
} as const;

export type OwnedObjectField = (typeof OwnedObjectField)[keyof typeof OwnedObjectField];

/** Read mask paths for `getTransactions` and `executeTransactions`. */
export const TransactionField = {
    /** Wildcard: every field. */
    ALL: '*',
    /** Transaction data (all sub-fields). */
    TRANSACTION: 'transaction',
    /** The transaction digest. */
    TRANSACTION_DIGEST: 'transaction.digest',
    /** The full BCS-encoded transaction. */
    TRANSACTION_BCS: 'transaction.bcs',
    /** User signatures (all sub-fields). */
    SIGNATURES: 'signatures',
    /** The full BCS-encoded signatures. */
    SIGNATURES_BCS: 'signatures.bcs',
    /** Transaction effects (all sub-fields). */
    EFFECTS: 'effects',
    /** The effects digest. */
    EFFECTS_DIGEST: 'effects.digest',
    /** The full BCS-encoded effects. */
    EFFECTS_BCS: 'effects.bcs',
    /** Transaction events (all sub-fields). */
    EVENTS: 'events',
    /** The events digest. */
    EVENTS_DIGEST: 'events.digest',
    /** Individual events (all sub-fields). */
    EVENTS_EVENTS: 'events.events',
    /** Full BCS-encoded event. */
    EVENTS_EVENTS_BCS: 'events.events.bcs',
    /** The ID of the package that emitted the event. */
    EVENTS_EVENTS_PACKAGE_ID: 'events.events.package_id',
    /** The module that emitted the event. */
    EVENTS_EVENTS_MODULE: 'events.events.module',
    /** The sender that triggered the event. */
    EVENTS_EVENTS_SENDER: 'events.events.sender',
    /** The type of the event. */
    EVENTS_EVENTS_EVENT_TYPE: 'events.events.event_type',
    /** The full BCS-encoded contents of the event. */
    EVENTS_EVENTS_BCS_CONTENTS: 'events.events.bcs_contents',
    /** The JSON-encoded contents of the event. */
    EVENTS_EVENTS_JSON_CONTENTS: 'events.events.json_contents',
    /** Checkpoint sequence number that included the transaction. */
    CHECKPOINT: 'checkpoint',
    /** Timestamp of the checkpoint that included the transaction. */
    TIMESTAMP: 'timestamp',
    /** Input objects (all sub-fields). */
    INPUT_OBJECTS: 'input_objects',
    /** Input object reference (object_id, version, digest). */
    INPUT_OBJECTS_REFERENCE: 'input_objects.reference',
    /** Input object ID. */
    INPUT_OBJECTS_REFERENCE_OBJECT_ID: 'input_objects.reference.object_id',
    /** Input object version. */
    INPUT_OBJECTS_REFERENCE_VERSION: 'input_objects.reference.version',
    /** Input object digest. */
    INPUT_OBJECTS_REFERENCE_DIGEST: 'input_objects.reference.digest',
    /** The full BCS-encoded input object. */
    INPUT_OBJECTS_BCS: 'input_objects.bcs',
    /** Output objects (all sub-fields). */
    OUTPUT_OBJECTS: 'output_objects',
    /** Output object reference (object_id, version, digest). */
    OUTPUT_OBJECTS_REFERENCE: 'output_objects.reference',
    /** Output object ID. */
    OUTPUT_OBJECTS_REFERENCE_OBJECT_ID: 'output_objects.reference.object_id',
    /** Output object version. */
    OUTPUT_OBJECTS_REFERENCE_VERSION: 'output_objects.reference.version',
    /** Output object digest. */
    OUTPUT_OBJECTS_REFERENCE_DIGEST: 'output_objects.reference.digest',
    /** The full BCS-encoded output object. */
    OUTPUT_OBJECTS_BCS: 'output_objects.bcs',
    /** Balance changes (all sub-fields). */
    BALANCE_CHANGES: 'balance_changes',
    /** The owner whose balance changed. */
    BALANCE_CHANGES_OWNER: 'balance_changes.owner',
    /** The coin type of the balance change. */
    BALANCE_CHANGES_COIN_TYPE: 'balance_changes.coin_type',
    /** The signed amount of the balance change. */
    BALANCE_CHANGES_AMOUNT: 'balance_changes.amount',
    /** Object changes (all sub-fields). */
    OBJECT_CHANGES: 'object_changes',
    /** Published-package object changes. */
    OBJECT_CHANGES_PUBLISHED: 'object_changes.published',
    /** Mutated-object changes. */
    OBJECT_CHANGES_MUTATED: 'object_changes.mutated',
    /** Deleted-object changes. */
    OBJECT_CHANGES_DELETED: 'object_changes.deleted',
    /** Wrapped-object changes. */
    OBJECT_CHANGES_WRAPPED: 'object_changes.wrapped',
    /** Unwrapped-object changes. */
    OBJECT_CHANGES_UNWRAPPED: 'object_changes.unwrapped',
    /** Created-object changes. */
    OBJECT_CHANGES_CREATED: 'object_changes.created',
} as const;

export type TransactionField = (typeof TransactionField)[keyof typeof TransactionField];

/** Read mask paths for `getServiceInfo`. */
export const ServiceInfoField = {
    /** Wildcard: every field. */
    ALL: '*',
    /** The chain ID (network identifier). */
    CHAIN_ID: 'chain_id',
    /** The chain identifier string. */
    CHAIN: 'chain',
    /** The current epoch. */
    EPOCH: 'epoch',
    /** Height of the last executed checkpoint. */
    EXECUTED_CHECKPOINT_HEIGHT: 'executed_checkpoint_height',
    /** Timestamp of the last executed checkpoint. */
    EXECUTED_CHECKPOINT_TIMESTAMP: 'executed_checkpoint_timestamp',
    /** Lowest available checkpoint for transaction/checkpoint data. */
    LOWEST_AVAILABLE_CHECKPOINT: 'lowest_available_checkpoint',
    /** Lowest available checkpoint for object data. */
    LOWEST_AVAILABLE_CHECKPOINT_OBJECTS: 'lowest_available_checkpoint_objects',
    /** The server version. */
    SERVER: 'server',
} as const;

export type ServiceInfoField = (typeof ServiceInfoField)[keyof typeof ServiceInfoField];

/** Read mask paths for `getEpoch`. Use `epochFeatureFlag` and `epochAttribute` for single protocol config keys. */
export const EpochField = {
    /** Wildcard: every field. */
    ALL: '*',
    /** The epoch number. */
    EPOCH: 'epoch',
    /** The validator committee for this epoch. */
    COMMITTEE: 'committee',
    /** The BCS-encoded system state. */
    BCS_SYSTEM_STATE: 'bcs_system_state',
    /** The first checkpoint in the epoch. */
    FIRST_CHECKPOINT: 'first_checkpoint',
    /** The last checkpoint in the epoch. */
    LAST_CHECKPOINT: 'last_checkpoint',
    /** The start timestamp of the epoch. */
    START: 'start',
    /** The end timestamp of the epoch. */
    END: 'end',
    /** The reference gas price during the epoch (in NANOS). */
    REFERENCE_GAS_PRICE: 'reference_gas_price',
    /** All protocol configuration fields. */
    PROTOCOL_CONFIG: 'protocol_config',
    /** The protocol version. */
    PROTOCOL_CONFIG_PROTOCOL_VERSION: 'protocol_config.protocol_version',
    /** All feature flags. */
    PROTOCOL_CONFIG_FEATURE_FLAGS: 'protocol_config.feature_flags',
    /** All protocol attributes. */
    PROTOCOL_CONFIG_ATTRIBUTES: 'protocol_config.attributes',
    /** All epoch-close-proof fields. */
    EPOCH_CLOSE_PROOF: 'epoch_close_proof',
    /** The certified checkpoint that closed the epoch. */
    EPOCH_CLOSE_PROOF_CHECKPOINT: 'epoch_close_proof.checkpoint',
    /** Effects of the epoch-change transaction. */
    EPOCH_CLOSE_PROOF_END_OF_EPOCH_TRANSACTION_EFFECTS:
        'epoch_close_proof.end_of_epoch_transaction_effects',
    /** Events emitted by the epoch-change transaction. */
    EPOCH_CLOSE_PROOF_END_OF_EPOCH_TRANSACTION_EVENTS:
        'epoch_close_proof.end_of_epoch_transaction_events',
    /** Raw BCS of the next epoch's start-of-epoch system-state objects. */
    EPOCH_CLOSE_PROOF_BCS_NEXT_EPOCH_SYSTEM_STATE_OBJECTS:
        'epoch_close_proof.bcs_next_epoch_system_state_objects',
} as const;

export type EpochField =
    | (typeof EpochField)[keyof typeof EpochField]
    | `protocol_config.feature_flags.${string}`
    | `protocol_config.attributes.${string}`;

/** Selects one protocol feature flag, e.g. `epochFeatureFlag('enable_vdf')`. */
export const epochFeatureFlag = (key: string) => `protocol_config.feature_flags.${key}` as const;
/** Selects one protocol attribute, e.g. `epochAttribute('max_tx_gas')`. */
export const epochAttribute = (key: string) => `protocol_config.attributes.${key}` as const;

/** Read mask paths for `getCheckpoint` and `streamCheckpoints`. */
export const CheckpointResponseField = {
    /** Wildcard: every field. */
    ALL: '*',
    /** All checkpoint data fields. */
    CHECKPOINT: 'checkpoint',
    /** The checkpoint sequence number. */
    CHECKPOINT_SEQUENCE_NUMBER: 'checkpoint.sequence_number',
    /** Checkpoint summary (all sub-fields). */
    CHECKPOINT_SUMMARY: 'checkpoint.summary',
    /** The checkpoint summary digest. */
    CHECKPOINT_SUMMARY_DIGEST: 'checkpoint.summary.digest',
    /** The full BCS-encoded checkpoint summary. */
    CHECKPOINT_SUMMARY_BCS: 'checkpoint.summary.bcs',
    /** Checkpoint contents (all sub-fields). */
    CHECKPOINT_CONTENTS: 'checkpoint.contents',
    /** The checkpoint contents digest. */
    CHECKPOINT_CONTENTS_DIGEST: 'checkpoint.contents.digest',
    /** The full BCS-encoded checkpoint contents. */
    CHECKPOINT_CONTENTS_BCS: 'checkpoint.contents.bcs',
    /** The validator aggregated signature. */
    CHECKPOINT_SIGNATURE: 'checkpoint.signature',
    /** All transactions in the checkpoint. */
    TRANSACTIONS: 'transactions',
    /** Transaction data of a checkpoint transaction (all sub-fields). */
    TRANSACTIONS_TRANSACTION: 'transactions.transaction',
    /** The transaction digest. */
    TRANSACTIONS_TRANSACTION_DIGEST: 'transactions.transaction.digest',
    /** The full BCS-encoded transaction. */
    TRANSACTIONS_TRANSACTION_BCS: 'transactions.transaction.bcs',
    /** User signatures (all sub-fields). */
    TRANSACTIONS_SIGNATURES: 'transactions.signatures',
    /** The full BCS-encoded signatures. */
    TRANSACTIONS_SIGNATURES_BCS: 'transactions.signatures.bcs',
    /** Transaction effects (all sub-fields). */
    TRANSACTIONS_EFFECTS: 'transactions.effects',
    /** The effects digest. */
    TRANSACTIONS_EFFECTS_DIGEST: 'transactions.effects.digest',
    /** The full BCS-encoded effects. */
    TRANSACTIONS_EFFECTS_BCS: 'transactions.effects.bcs',
    /** Transaction events (all sub-fields). */
    TRANSACTIONS_EVENTS: 'transactions.events',
    /** The events digest. */
    TRANSACTIONS_EVENTS_DIGEST: 'transactions.events.digest',
    /** Full BCS-encoded individual events. */
    TRANSACTIONS_EVENTS_EVENTS_BCS: 'transactions.events.events.bcs',
    /** Checkpoint sequence number of the transaction. */
    TRANSACTIONS_CHECKPOINT: 'transactions.checkpoint',
    /** Timestamp of the transaction. */
    TRANSACTIONS_TIMESTAMP: 'transactions.timestamp',
    /** Input objects (all sub-fields). */
    TRANSACTIONS_INPUT_OBJECTS: 'transactions.input_objects',
    /** The full BCS-encoded input object. */
    TRANSACTIONS_INPUT_OBJECTS_BCS: 'transactions.input_objects.bcs',
    /** Output objects (all sub-fields). */
    TRANSACTIONS_OUTPUT_OBJECTS: 'transactions.output_objects',
    /** The full BCS-encoded output object. */
    TRANSACTIONS_OUTPUT_OBJECTS_BCS: 'transactions.output_objects.bcs',
    /** Balance changes (all sub-fields). */
    TRANSACTIONS_BALANCE_CHANGES: 'transactions.balance_changes',
    /** Object changes (all sub-fields). */
    TRANSACTIONS_OBJECT_CHANGES: 'transactions.object_changes',
    /** All events in the checkpoint. */
    EVENTS: 'events',
    /** Full BCS-encoded event. */
    EVENTS_BCS: 'events.bcs',
    /** The ID of the package that emitted the event. */
    EVENTS_PACKAGE_ID: 'events.package_id',
    /** The module that emitted the event. */
    EVENTS_MODULE: 'events.module',
    /** The sender that triggered the event. */
    EVENTS_SENDER: 'events.sender',
    /** The type of the event. */
    EVENTS_EVENT_TYPE: 'events.event_type',
    /** The full BCS-encoded contents of the event. */
    EVENTS_BCS_CONTENTS: 'events.bcs_contents',
    /** The JSON-encoded contents of the event. */
    EVENTS_JSON_CONTENTS: 'events.json_contents',
} as const;

export type CheckpointResponseField =
    (typeof CheckpointResponseField)[keyof typeof CheckpointResponseField];

/** Read mask paths for `simulateTransactions`. */
export const SimulateField = {
    /** Wildcard: every field. */
    ALL: '*',
    /** The simulated executed transaction (all sub-fields). */
    EXECUTED_TRANSACTION: 'executed_transaction',
    /** Transaction data of the executed transaction (all sub-fields). */
    EXECUTED_TRANSACTION_TRANSACTION: 'executed_transaction.transaction',
    /** The transaction digest. */
    EXECUTED_TRANSACTION_TRANSACTION_DIGEST: 'executed_transaction.transaction.digest',
    /** The full BCS-encoded transaction. */
    EXECUTED_TRANSACTION_TRANSACTION_BCS: 'executed_transaction.transaction.bcs',
    /** User signatures (all sub-fields). */
    EXECUTED_TRANSACTION_SIGNATURES: 'executed_transaction.signatures',
    /** The full BCS-encoded signatures. */
    EXECUTED_TRANSACTION_SIGNATURES_BCS: 'executed_transaction.signatures.bcs',
    /** Transaction effects (all sub-fields). */
    EXECUTED_TRANSACTION_EFFECTS: 'executed_transaction.effects',
    /** The effects digest. */
    EXECUTED_TRANSACTION_EFFECTS_DIGEST: 'executed_transaction.effects.digest',
    /** The full BCS-encoded effects. */
    EXECUTED_TRANSACTION_EFFECTS_BCS: 'executed_transaction.effects.bcs',
    /** Transaction events (all sub-fields). */
    EXECUTED_TRANSACTION_EVENTS: 'executed_transaction.events',
    /** The events digest. */
    EXECUTED_TRANSACTION_EVENTS_DIGEST: 'executed_transaction.events.digest',
    /** Full BCS-encoded individual events. */
    EXECUTED_TRANSACTION_EVENTS_EVENTS_BCS: 'executed_transaction.events.events.bcs',
    /** Checkpoint sequence number that included the transaction. */
    EXECUTED_TRANSACTION_CHECKPOINT: 'executed_transaction.checkpoint',
    /** Timestamp of the transaction. */
    EXECUTED_TRANSACTION_TIMESTAMP: 'executed_transaction.timestamp',
    /** Input objects (all sub-fields). */
    EXECUTED_TRANSACTION_INPUT_OBJECTS: 'executed_transaction.input_objects',
    /** The full BCS-encoded input object. */
    EXECUTED_TRANSACTION_INPUT_OBJECTS_BCS: 'executed_transaction.input_objects.bcs',
    /** Output objects (all sub-fields). */
    EXECUTED_TRANSACTION_OUTPUT_OBJECTS: 'executed_transaction.output_objects',
    /** The full BCS-encoded output object. */
    EXECUTED_TRANSACTION_OUTPUT_OBJECTS_BCS: 'executed_transaction.output_objects.bcs',
    /** Balance changes (all sub-fields). */
    EXECUTED_TRANSACTION_BALANCE_CHANGES: 'executed_transaction.balance_changes',
    /** Object changes (all sub-fields). */
    EXECUTED_TRANSACTION_OBJECT_CHANGES: 'executed_transaction.object_changes',
    /** The suggested gas price (in NANOS). */
    SUGGESTED_GAS_PRICE: 'suggested_gas_price',
    /** Execution result (all sub-fields). */
    EXECUTION_RESULT: 'execution_result',
    /** Per-command results (on success, all sub-fields). */
    EXECUTION_RESULT_COMMAND_RESULTS: 'execution_result.command_results',
    /** Objects mutated by reference. */
    EXECUTION_RESULT_COMMAND_RESULTS_MUTATED_BY_REF:
        'execution_result.command_results.mutated_by_ref',
    /** Return values from the command. */
    EXECUTION_RESULT_COMMAND_RESULTS_RETURN_VALUES:
        'execution_result.command_results.return_values',
    /** Execution error details (on failure, all sub-fields). */
    EXECUTION_RESULT_EXECUTION_ERROR: 'execution_result.execution_error',
    /** The BCS-encoded error kind. */
    EXECUTION_RESULT_EXECUTION_ERROR_BCS_KIND: 'execution_result.execution_error.bcs_kind',
    /** The error source description. */
    EXECUTION_RESULT_EXECUTION_ERROR_SOURCE: 'execution_result.execution_error.source',
    /** The index of the command that failed. */
    EXECUTION_RESULT_EXECUTION_ERROR_COMMAND_INDEX:
        'execution_result.execution_error.command_index',
} as const;

export type SimulateField = (typeof SimulateField)[keyof typeof SimulateField];

/** Read mask paths for `viewFunctionCalls`. They apply to each call result, not the response. */
export const ViewFunctionCallField = {
    /** Wildcard: every field. */
    ALL: '*',
    /** Execution result (all sub-fields). */
    EXECUTION_RESULT: 'execution_result',
    /** Return values of the call (all sub-fields). */
    EXECUTION_RESULT_RETURN_VALUES: 'execution_result.return_values',
    /** The argument each return value came from. */
    EXECUTION_RESULT_RETURN_VALUES_ARGUMENT: 'execution_result.return_values.argument',
    /** The Move type of each return value. */
    EXECUTION_RESULT_RETURN_VALUES_TYPE_TAG: 'execution_result.return_values.type_tag',
    /** The BCS-encoded return values. */
    EXECUTION_RESULT_RETURN_VALUES_BCS: 'execution_result.return_values.bcs',
    /** The return values rendered as JSON. */
    EXECUTION_RESULT_RETURN_VALUES_JSON: 'execution_result.return_values.json',
    /** Execution error details (on failure, all sub-fields). */
    EXECUTION_RESULT_EXECUTION_ERROR: 'execution_result.execution_error',
    /** The BCS-encoded error kind. */
    EXECUTION_RESULT_EXECUTION_ERROR_BCS_KIND: 'execution_result.execution_error.bcs_kind',
    /** The error source description. */
    EXECUTION_RESULT_EXECUTION_ERROR_SOURCE: 'execution_result.execution_error.source',
    /** The index of the command that failed. */
    EXECUTION_RESULT_EXECUTION_ERROR_COMMAND_INDEX:
        'execution_result.execution_error.command_index',
} as const;

export type ViewFunctionCallField =
    (typeof ViewFunctionCallField)[keyof typeof ViewFunctionCallField];

/** Read mask paths for `listDynamicFields`. */
export const DynamicFieldField = {
    /** Wildcard: every field. */
    ALL: '*',
    /** The kind of dynamic field (field or object). */
    KIND: 'kind',
    /** The parent object ID. */
    PARENT: 'parent',
    /** The field object ID. */
    FIELD_ID: 'field_id',
    /** The child object ID (for dynamic object fields). */
    CHILD_ID: 'child_id',
    /** BCS-encoded field name. */
    NAME: 'name',
    /** BCS-encoded field value. */
    VALUE: 'value',
    /** The Move type of the value. */
    VALUE_TYPE: 'value_type',
    /** The full field object (sub-fields match `get_objects`). */
    FIELD_OBJECT: 'field_object',
    /** The full child object (sub-fields match `get_objects`). */
    CHILD_OBJECT: 'child_object',
} as const;

export type DynamicFieldField = (typeof DynamicFieldField)[keyof typeof DynamicFieldField];

/**
 * The mask the server applies when a request sends none, keyed by RPC method.
 * Must match `read_masks.rs` in `iota-sdk-grpc-types`.
 */
export const DEFAULT_READ_MASKS = {
    getServiceInfo: [
        ServiceInfoField.CHAIN_ID,
        ServiceInfoField.EPOCH,
        ServiceInfoField.EXECUTED_CHECKPOINT_HEIGHT,
        ServiceInfoField.EXECUTED_CHECKPOINT_TIMESTAMP,
        ServiceInfoField.LOWEST_AVAILABLE_CHECKPOINT,
        ServiceInfoField.LOWEST_AVAILABLE_CHECKPOINT_OBJECTS,
    ],
    getEpoch: [
        EpochField.EPOCH,
        EpochField.FIRST_CHECKPOINT,
        EpochField.LAST_CHECKPOINT,
        EpochField.START,
        EpochField.END,
        EpochField.REFERENCE_GAS_PRICE,
        EpochField.PROTOCOL_CONFIG_PROTOCOL_VERSION,
    ],
    getTransactions: [
        TransactionField.TRANSACTION,
        TransactionField.SIGNATURES,
        TransactionField.CHECKPOINT,
        TransactionField.TIMESTAMP,
    ],
    getObjects: [ObjectField.REFERENCE, ObjectField.BCS],
    getCheckpoint: [CheckpointResponseField.CHECKPOINT_SUMMARY],
    listDynamicFields: [DynamicFieldField.PARENT, DynamicFieldField.FIELD_ID],
    listOwnedObjects: [OwnedObjectField.REFERENCE, OwnedObjectField.BCS],
    executeTransactions: [
        TransactionField.TRANSACTION_DIGEST,
        TransactionField.EFFECTS,
        TransactionField.EVENTS,
        TransactionField.INPUT_OBJECTS,
        TransactionField.OUTPUT_OBJECTS,
    ],
    simulateTransactions: [
        SimulateField.EXECUTED_TRANSACTION_TRANSACTION,
        SimulateField.EXECUTED_TRANSACTION_EFFECTS,
        SimulateField.EXECUTED_TRANSACTION_EVENTS,
        SimulateField.EXECUTED_TRANSACTION_INPUT_OBJECTS,
        SimulateField.EXECUTED_TRANSACTION_OUTPUT_OBJECTS,
        SimulateField.SUGGESTED_GAS_PRICE,
        SimulateField.EXECUTION_RESULT,
    ],
    viewFunctionCalls: [ViewFunctionCallField.EXECUTION_RESULT],
} as const;

/** Drops empty and duplicate paths, and any path an ancestor already selects (`effects` covers `effects.bcs`). */
export function normalizeReadMask(paths: readonly string[]): string[] {
    // Sort by length so broader (shorter) paths are processed first.
    const pathsSorted = paths.filter((p) => p.length > 0).sort((a, b) => a.length - b.length);

    if (pathsSorted.includes('*')) {
        return ['*'];
    }

    const normalized: string[] = [];

    for (const path of pathsSorted) {
        const covered = normalized.some((n) => path === n || path.startsWith(`${n}.`));

        if (!covered) {
            normalized.push(path);
        }
    }

    return normalized;
}

/** Combines masks into one normalized mask. */
export function mergeReadMasks(...masks: (readonly string[])[]): string[] {
    return normalizeReadMask(masks.flat());
}

/**
 * Builds the request `FieldMask` from one path or many, using `fallback` when `fields` is undefined.
 * A string is split on commas, like Rust's `ReadMask::from("effects,checkpoint")`.
 * An empty list selects nothing: the server returns every field unset.
 */
export function toReadMask(
    fields: string | readonly string[] | undefined,
    fallback: readonly string[],
): FieldMask {
    let paths: readonly string[];

    if (fields === undefined) {
        paths = fallback;
    } else if (typeof fields === 'string') {
        paths = fields.split(',');
    } else {
        paths = fields;
    }

    return create(FieldMaskSchema, { paths: normalizeReadMask(paths) });
}
