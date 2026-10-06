// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@iota/bcs';
import { BcsReader, toHex } from '@iota/bcs';
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
import type { Event as ProtoEvent } from '../proto/iota/grpc/v1/event_pb.js';
import type { Object$, Objects } from '../proto/iota/grpc/v1/object_pb.js';
import type {
    UserSignature as ProtoUserSignature,
    ValidatorAggregatedSignature as ProtoValidatorAggregatedSignature,
} from '../proto/iota/grpc/v1/signatures_pb.js';
import type { ExecutionError as ProtoExecutionError } from '../proto/iota/grpc/v1/transaction_execution_service_pb.js';
import type {
    ExecutedTransaction,
    Transaction as ProtoTransaction,
    TransactionEffects as ProtoTransactionEffects,
    TransactionEvents as ProtoTransactionEvents,
} from '../proto/iota/grpc/v1/transaction_pb.js';
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
