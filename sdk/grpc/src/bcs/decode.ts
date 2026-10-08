// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { JsonValue } from '@bufbuild/protobuf';
import type { Value } from '@bufbuild/protobuf/wkt';
import type { BcsType } from '@iota/bcs';
import { BcsReader, toHex } from '@iota/bcs';
import type { TypeTag } from '@iota/iota-sdk/bcs';
import { bcs, TypeTagSerializer } from '@iota/iota-sdk/bcs';
import {
    IOTA_FRAMEWORK_ADDRESS,
    IOTA_TYPE_ARG,
    normalizeIotaAddress,
    normalizeStructTag,
} from '@iota/iota-sdk/utils';

import { ProtoConversionError } from '../errors.js';
import type { BcsData } from '../proto/iota/grpc/v1/bcs_pb.js';
import type {
    CheckpointContents as ProtoCheckpointContents,
    CheckpointSummary as ProtoCheckpointSummary,
} from '../proto/iota/grpc/v1/checkpoint_pb.js';
import type {
    Argument as ProtoArgument,
    CommandOutput as ProtoCommandOutput,
} from '../proto/iota/grpc/v1/command_pb.js';
import type { Event as ProtoEvent } from '../proto/iota/grpc/v1/event_pb.js';
import type { Object$, Objects } from '../proto/iota/grpc/v1/object_pb.js';
import type {
    UserSignature as ProtoUserSignature,
    ValidatorAggregatedSignature as ProtoValidatorAggregatedSignature,
} from '../proto/iota/grpc/v1/signatures_pb.js';
import type {
    ExecutionError as ProtoExecutionError,
    ViewFunctionCallOutputs,
} from '../proto/iota/grpc/v1/transaction_execution_service_pb.js';
import type {
    ExecutedTransaction,
    Transaction as ProtoTransaction,
    TransactionEffects as ProtoTransactionEffects,
    TransactionEvents as ProtoTransactionEvents,
} from '../proto/iota/grpc/v1/transaction_pb.js';
import type { TypeTag as ProtoTypeTag } from '../proto/iota/grpc/v1/types_pb.js';
import type { CheckpointSummary } from './checkpoint.js';
import { CheckpointContents, VersionedCheckpointSummary } from './checkpoint.js';
import type { Event } from './event.js';
import { VersionedEvent } from './event.js';
import { ExecutionError } from './execution-error.js';
import type { IotaObject } from './object.js';
import { VersionedObject } from './object.js';
import type { ValidatorAggregatedSignature } from './signatures.js';
import { UserSignature, VersionedValidatorAggregatedSignature } from './signatures.js';

/** Like Rust's `bcs::from_bytes`, rejects bytes left over after the value. */
function decode<S extends BcsType<any>>(
    schema: S,
    data: BcsData | undefined,
    field: string,
): S['$inferType'] {
    if (data === undefined) {
        throw new ProtoConversionError(`missing field '${field}'`);
    }

    const reader = new BcsReader(data.data);
    let value: S['$inferType'];
    try {
        value = schema.read(reader);
    } catch (error) {
        throw new ProtoConversionError(`invalid field '${field}': ${(error as Error).message}`);
    }

    try {
        reader.read8();
    } catch {
        return value;
    }
    throw new ProtoConversionError(`invalid field '${field}': trailing bytes`);
}

export function decodeObject(object: Object$): IotaObject {
    return decode(VersionedObject, object.bcs, 'bcs').V1!;
}

/** The id of a decoded object: a package's own, or the UID that opens a struct's contents. */
export function objectIdOf(object: IotaObject): string {
    return object.data.$kind === 'Package'
        ? object.data.Package.id
        : `0x${toHex(object.data.Struct.contents.slice(0, 32))}`;
}

export interface Coin {
    /** The `T` of `Coin<T>`. */
    coinType: string;
    id: string;
    balance: bigint;
}

const IOTA_COIN_TYPE = normalizeStructTag(IOTA_TYPE_ARG);
const IOTA_FRAMEWORK = normalizeIotaAddress(IOTA_FRAMEWORK_ADDRESS);

/** Like Rust's `Coin::try_from_object`: a gas coin, a `Coin<T>`, or a struct spelled `0x2::coin::Coin<T>`. */
export function decodeCoin(object: Object$): Coin {
    const decoded = decodeObject(object);
    const { data } = decoded;

    if (data.$kind !== 'Struct') {
        throw new ProtoConversionError("invalid field 'coin': not a coin");
    }

    const { objectType, contents } = data.Struct;
    let coinType: string | undefined;

    switch (objectType.$kind) {
        case 'GasCoin':
            coinType = IOTA_COIN_TYPE;
            break;
        case 'Coin':
            coinType = objectType.Coin;
            break;
        case 'Other':
            const { address, module, name, typeParams } = objectType.Other;
            if (
                address === IOTA_FRAMEWORK &&
                module === 'coin' &&
                name === 'Coin' &&
                typeParams.length === 1
            ) {
                coinType = TypeTagSerializer.tagToString(typeParams[0]);
            }
            break;
    }

    if (coinType === undefined) {
        throw new ProtoConversionError("invalid field 'coin': not a coin");
    }

    // A `UID` followed by a `Balance`'s u64.
    if (contents.length !== 40) {
        throw new ProtoConversionError("invalid field 'coin': invalid content length");
    }

    return {
        coinType,
        id: objectIdOf(decoded),
        balance: BigInt(bcs.u64().parse(contents.slice(32))),
    };
}

export function decodeEvent(event: ProtoEvent): Event {
    return decode(VersionedEvent, event.bcs, 'bcs').V1!;
}

export function decodeTransactionEvents(events: ProtoTransactionEvents): Event[] {
    return (events.events?.events ?? []).map(
        (event, index) => decode(VersionedEvent, event.bcs, `events.events[${index}].bcs`).V1!,
    );
}

export function decodeTransaction(transaction: ProtoTransaction) {
    return decode(bcs.TransactionData, transaction.bcs, 'bcs');
}

export function decodeTransactionEffects(effects: ProtoTransactionEffects) {
    return decode(bcs.TransactionEffects, effects.bcs, 'bcs');
}

export function decodeCheckpointSummary(summary: ProtoCheckpointSummary): CheckpointSummary {
    return decode(VersionedCheckpointSummary, summary.bcs, 'bcs').V1!;
}

export function decodeCheckpointContents(contents: ProtoCheckpointContents): CheckpointContents {
    const decoded = decode(CheckpointContents, contents.bcs, 'bcs');
    const { digests, signatures } = decoded.V1!;

    if (digests.length !== signatures.length) {
        throw new ProtoConversionError(
            `invalid field 'bcs': ${digests.length} transactions but ${signatures.length} signature lists`,
        );
    }

    return decoded;
}

export function decodeValidatorAggregatedSignature(
    signature: ProtoValidatorAggregatedSignature,
): ValidatorAggregatedSignature {
    return decode(VersionedValidatorAggregatedSignature, signature.bcs, 'bcs').V1!;
}

export function decodeUserSignature(signature: ProtoUserSignature): string {
    return decode(UserSignature, signature.bcs, 'bcs');
}

export function decodeExecutionError(error: ProtoExecutionError): ExecutionError {
    return decode(ExecutionError, error.bcsKind, 'bcs_kind');
}

export interface CommandOutput {
    argument?: typeof bcs.Argument.$inferType;
    typeTag?: TypeTag;
    bcs?: Uint8Array;
    json?: JsonValue;
}

export interface ViewOutputs {
    returnValues?: CommandOutput[];
    executionError?: { error?: ExecutionError; source?: string; commandIndex?: bigint };
}

/** Like the Rust FFI's `ViewFunctionCallOutputs::try_from`. */
export function decodeViewOutputs(outputs: ViewFunctionCallOutputs): ViewOutputs {
    const { executionResult } = outputs;

    switch (executionResult.case) {
        case 'returnValues':
            return { returnValues: executionResult.value.outputs.map(decodeCommandOutput) };
        case 'executionError': {
            const error = executionResult.value;
            return {
                executionError: {
                    error: error.bcsKind && decodeExecutionError(error),
                    source: error.source,
                    commandIndex: error.commandIndex,
                },
            };
        }
        default:
            return {};
    }
}

function decodeCommandOutput(output: ProtoCommandOutput): CommandOutput {
    return {
        argument: output.argument && decodeArgument(output.argument),
        typeTag: output.typeTag && decodeTypeTag(output.typeTag),
        bcs: output.bcs?.data,
        json: output.json && decodeJsonValue(output.json),
    };
}

function decodeArgument(argument: ProtoArgument): typeof bcs.Argument.$inferType {
    const { kind } = argument;

    switch (kind.case) {
        case 'gasCoin':
            return { $kind: 'GasCoin', GasCoin: true };
        case 'input':
            return {
                $kind: 'Input',
                Input: required(kind.value.index, 'argument.input.index') & 0xffff,
            };
        case 'result': {
            const index = required(kind.value.index, 'argument.result.index') & 0xffff;
            const nested = kind.value.nestedResultIndex;
            return nested === undefined
                ? { $kind: 'Result', Result: index }
                : { $kind: 'NestedResult', NestedResult: [index, nested & 0xffff] };
        }
        case 'unknown':
            throw new ProtoConversionError("invalid field 'argument.kind': unknown argument type");
        default:
            throw new ProtoConversionError("missing field 'argument.kind'");
    }
}

function decodeTypeTag(tag: ProtoTypeTag): TypeTag {
    const { typeTag } = tag;

    switch (typeTag.case) {
        case 'vectorTag':
            return {
                vector: decodeTypeTag(
                    required(typeTag.value.innerType, 'type_tag.vector.inner_type'),
                ),
            };
        case 'structTag':
            return decodeStructTag(typeTag.value.structTag);
        case undefined:
            throw new ProtoConversionError("missing field 'type_tag'");
        default:
            return TypeTagSerializer.parseFromStr(typeTag.case.slice(0, -'Tag'.length));
    }
}

function decodeStructTag(structTag: string): TypeTag {
    let parsed: TypeTag;
    try {
        parsed = TypeTagSerializer.parseFromStr(structTag, true);
    } catch (error) {
        throw new ProtoConversionError(
            `invalid field 'type_tag.struct_tag': ${(error as Error).message}`,
        );
    }

    if (!('struct' in parsed)) {
        throw new ProtoConversionError("invalid field 'type_tag.struct_tag': not a struct tag");
    }

    return parsed;
}

function decodeJsonValue(value: Value): JsonValue {
    const { kind } = value;

    switch (kind.case) {
        case 'numberValue':
            return Number.isFinite(kind.value) ? kind.value : null;
        case 'stringValue':
        case 'boolValue':
            return kind.value;
        case 'structValue':
            return Object.fromEntries(
                Object.entries(kind.value.fields).map(([key, field]) => [
                    key,
                    decodeJsonValue(field),
                ]),
            );
        case 'listValue':
            return kind.value.values.map(decodeJsonValue);
        default:
            return null;
    }
}

export interface CheckpointTransaction {
    transaction: {
        transaction: ReturnType<typeof decodeTransaction>;
        signatures: string[];
    };
    effects: ReturnType<typeof decodeTransactionEffects>;
    /** `null` when the read mask left the events out. */
    events: Event[] | null;
    inputObjects: IotaObject[];
    outputObjects: IotaObject[];
}

/** Every part of an executed transaction. Fails if any part other than the events is absent. */
export function decodeCheckpointTransaction(executed: ExecutedTransaction): CheckpointTransaction {
    const { transaction, signatures, effects, events, inputObjects, outputObjects } = executed;

    return {
        transaction: {
            transaction: decode(
                bcs.TransactionData,
                required(transaction, 'transaction').bcs,
                'transaction.bcs',
            ),
            signatures: required(signatures, 'signatures').signatures.map((signature, index) =>
                decode(UserSignature, signature.bcs, `signatures.signatures[${index}].bcs`),
            ),
        },
        effects: decode(bcs.TransactionEffects, required(effects, 'effects').bcs, 'effects.bcs'),
        events:
            events === undefined
                ? null
                : (events.events?.events ?? []).map(
                      (event, index) =>
                          decode(VersionedEvent, event.bcs, `events.events.events[${index}].bcs`)
                              .V1!,
                  ),
        inputObjects: decodeObjects(required(inputObjects, 'input_objects'), 'input_objects'),
        outputObjects: decodeObjects(required(outputObjects, 'output_objects'), 'output_objects'),
    };
}

function decodeObjects(objects: Objects, field: string): IotaObject[] {
    return objects.objects.map(
        (object, index) =>
            decode(VersionedObject, object.bcs, `${field}.objects[${index}].bcs`).V1!,
    );
}

function required<T>(value: T | undefined, field: string): T {
    if (value === undefined) {
        throw new ProtoConversionError(`missing field '${field}'`);
    }
    return value;
}
