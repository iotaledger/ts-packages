// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { MessageInitShape } from '@bufbuild/protobuf';
import { create } from '@bufbuild/protobuf';
import { fromHex } from '@iota/bcs';
import { TransactionDataBuilder } from '@iota/iota-sdk/transactions';
import { describe, expect, it } from 'vitest';

import { CheckpointContents } from '../../../src/bcs/checkpoint.js';
import {
    decodeCheckpointContents,
    decodeCheckpointSummary,
    decodeEvent,
    decodeExecutionError,
    decodeObject,
    decodeTransaction,
    decodeTransactionEffects,
    decodeTransactionEvents,
    decodeUserSignature,
    decodeValidatorAggregatedSignature,
    decodeViewOutputs,
    objectIdOf,
} from '../../../src/bcs/decode.js';
import { ExecutionError } from '../../../src/bcs/execution-error.js';
import { ProtoConversionError } from '../../../src/errors.js';
import {
    CheckpointContentsSchema,
    CheckpointSummarySchema,
} from '../../../src/proto/iota/grpc/v1/checkpoint_pb.js';
import type { CommandOutputSchema } from '../../../src/proto/iota/grpc/v1/command_pb.js';
import { EventSchema } from '../../../src/proto/iota/grpc/v1/event_pb.js';
import { ObjectSchema } from '../../../src/proto/iota/grpc/v1/object_pb.js';
import {
    UserSignatureSchema,
    ValidatorAggregatedSignatureSchema,
} from '../../../src/proto/iota/grpc/v1/signatures_pb.js';
import {
    ExecutionErrorSchema,
    ViewFunctionCallOutputsSchema,
} from '../../../src/proto/iota/grpc/v1/transaction_execution_service_pb.js';
import {
    TransactionEffectsSchema,
    TransactionEventsSchema,
    TransactionSchema,
} from '../../../src/proto/iota/grpc/v1/transaction_pb.js';

function readFixture(name: string) {
    return JSON.parse(readFileSync(path.resolve(__dirname, `../../fixtures/${name}`), 'utf8'));
}

const objects = readFixture('objects.json').objects as {
    kind: string;
    objectId: string;
    bcs: string;
}[];
const events = readFixture('events.json');
const checkpoints = readFixture('checkpoints.json');
const userSignatures = readFixture('user-signatures.json').transactions;
const failure = readFixture('execution-errors.json').failures[0];

const bcsData = (hex: string) => ({ data: fromHex(hex) });

describe('decodeObject', () => {
    it.each(objects.map((object) => [object.kind, object] as const))(
        'decodes a %s and reads its id',
        (_, object) => {
            const decoded = decodeObject(create(ObjectSchema, { bcs: bcsData(object.bcs) }));

            expect(objectIdOf(decoded)).toBe(object.objectId);
        },
    );

    it('reports a missing bcs field', () => {
        expect(() => decodeObject(create(ObjectSchema))).toThrow(
            new ProtoConversionError("missing field 'bcs'"),
        );
    });

    it('reports bytes that do not decode', () => {
        const truncated = objects[0].bcs.slice(0, -2);

        expect(() => decodeObject(create(ObjectSchema, { bcs: bcsData(truncated) }))).toThrow(
            /^proto conversion error: invalid field 'bcs': /,
        );
    });

    it('rejects bytes left over after the object, as bcs::from_bytes does', () => {
        const padded = `${objects[0].bcs}00`;

        expect(() => decodeObject(create(ObjectSchema, { bcs: bcsData(padded) }))).toThrow(
            new ProtoConversionError("invalid field 'bcs': trailing bytes"),
        );
    });
});

describe('decodeEvent and decodeTransactionEvents', () => {
    const protoEvents = events.events.map((event: { bcs: string }) =>
        create(EventSchema, { bcs: bcsData(event.bcs) }),
    );

    it('decode the same events', () => {
        const decoded = decodeTransactionEvents(
            create(TransactionEventsSchema, { events: { events: protoEvents } }),
        );

        expect(decoded).toEqual(protoEvents.map(decodeEvent));
        expect(decoded.map((event) => event.module)).toEqual(
            events.events.map((event: { module: string }) => event.module),
        );
    });

    it('names the event that failed to decode', () => {
        const broken = [protoEvents[0], create(EventSchema)];

        expect(() =>
            decodeTransactionEvents(
                create(TransactionEventsSchema, { events: { events: broken } }),
            ),
        ).toThrow(new ProtoConversionError("missing field 'events.events[1].bcs'"));
    });

    it('reads absent events as none', () => {
        expect(decodeTransactionEvents(create(TransactionEventsSchema))).toEqual([]);
    });
});

describe('checkpoint decoders', () => {
    const { recent } = checkpoints;

    it('decodes the summary', () => {
        const summary = decodeCheckpointSummary(
            create(CheckpointSummarySchema, { bcs: bcsData(recent.summaryBcs) }),
        );

        expect(summary.sequenceNumber).toBe(recent.sequenceNumber);
    });

    it('decodes the contents', () => {
        const contents = decodeCheckpointContents(
            create(CheckpointContentsSchema, { bcs: bcsData(recent.contentsBcs) }),
        );

        expect(contents.V1!.digests).toHaveLength(recent.transactions.length);
    });

    it('rejects contents with a signature list missing, as Rust does', () => {
        const { V1 } = CheckpointContents.parse(fromHex(recent.contentsBcs));
        const mismatched = CheckpointContents.serialize({
            V1: { digests: V1!.digests, signatures: V1!.signatures.slice(1) },
        }).toBytes();

        expect(() =>
            decodeCheckpointContents(
                create(CheckpointContentsSchema, { bcs: { data: mismatched } }),
            ),
        ).toThrow(/transactions but \d+ signature lists/);
    });

    it('decodes the validator signature', () => {
        const signature = decodeValidatorAggregatedSignature(
            create(ValidatorAggregatedSignatureSchema, { bcs: bcsData(recent.signatureBcs) }),
        );

        expect(signature.epoch).toBe(recent.epoch);
    });
});

describe('transaction decoders', () => {
    const [tx] = userSignatures;

    it('decodes a transaction that hashes to its digest', () => {
        const proto = create(TransactionSchema, { bcs: bcsData(tx.transactionBcs) });

        expect(decodeTransaction(proto).V1!.kind.$kind).toBe('ProgrammableTransaction');
        expect(TransactionDataBuilder.getDigestFromBytes(proto.bcs!.data)).toBe(tx.transaction);
    });

    it('decodes a user signature', () => {
        const signature = decodeUserSignature(
            create(UserSignatureSchema, { bcs: bcsData(tx.signatures[0]) }),
        );

        expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('decodes the effects of a failed transaction', () => {
        const effects = decodeTransactionEffects(
            create(TransactionEffectsSchema, { bcs: bcsData(failure.effectsBcs) }),
        );

        expect(effects.V1!.status.Failed!.error.$kind).toBe('MoveAbort');
    });
});

describe('decodeExecutionError', () => {
    it('decodes bcs_kind', () => {
        // The error of failed effects starts after the V1 tag and the Failure status.
        const fromEffects = fromHex(failure.effectsBcs).slice(2);
        const length = ExecutionError.serialize(ExecutionError.parse(fromEffects)).toBytes().length;
        const bcsKind = { data: fromEffects.slice(0, length) };

        const error = decodeExecutionError(create(ExecutionErrorSchema, { bcsKind }));

        expect(error.$kind).toBe('MoveAbort');
    });

    it('names bcs_kind when it is missing', () => {
        expect(() => decodeExecutionError(create(ExecutionErrorSchema))).toThrow(
            new ProtoConversionError("missing field 'bcs_kind'"),
        );
    });
});

describe('decodeViewOutputs', () => {
    const FRAMEWORK = '0x0000000000000000000000000000000000000000000000000000000000000002';

    function returning(...outputs: MessageInitShape<typeof CommandOutputSchema>[]) {
        return create(ViewFunctionCallOutputsSchema, {
            executionResult: { case: 'returnValues', value: { outputs } },
        });
    }

    function aborting(error: MessageInitShape<typeof ExecutionErrorSchema>) {
        return create(ViewFunctionCallOutputsSchema, {
            executionResult: { case: 'executionError', value: error },
        });
    }

    it('reads the values of a call that returned', () => {
        const bcs75 = new Uint8Array([75, 0, 0, 0, 0, 0, 0, 0]);

        const decoded = decodeViewOutputs(
            returning(
                {
                    argument: { kind: { case: 'result', value: { index: 0 } } },
                    typeTag: { typeTag: { case: 'u64Tag', value: true } },
                    bcs: { data: bcs75 },
                    json: { kind: { case: 'stringValue', value: '75' } },
                },
                {},
            ),
        );

        expect(decoded).toEqual({
            returnValues: [
                {
                    argument: { $kind: 'Result', Result: 0 },
                    typeTag: { u64: null },
                    bcs: bcs75,
                    json: '75',
                },
                {},
            ],
        });
    });

    it('reads the error of a call that aborted', () => {
        const decoded = decodeViewOutputs(
            aborting({
                bcsKind: { data: ExecutionError.serialize({ InsufficientGas: null }).toBytes() },
                source: 'discount over 100%',
                commandIndex: 0n,
            }),
        );

        expect(decoded.returnValues).toBeUndefined();
        expect(decoded.executionError?.error?.$kind).toBe('InsufficientGas');
        expect(decoded.executionError?.source).toBe('discount over 100%');
        expect(decoded.executionError?.commandIndex).toBe(0n);
    });

    it('leaves the error kind out without bcs_kind', () => {
        expect(decodeViewOutputs(aborting({})).executionError).toEqual({});
    });

    it('reads neither when the read mask left the execution result out', () => {
        expect(decodeViewOutputs(create(ViewFunctionCallOutputsSchema))).toEqual({});
    });

    it.each([
        ['the gas coin', { case: 'gasCoin', value: {} }, { $kind: 'GasCoin', GasCoin: true }],
        ['an input', { case: 'input', value: { index: 2 } }, { $kind: 'Input', Input: 2 }],
        [
            'a nested result',
            { case: 'result', value: { index: 1, nestedResultIndex: 3 } },
            { $kind: 'NestedResult', NestedResult: [1, 3] },
        ],
        [
            'indexes past u16, like Rust',
            { case: 'result', value: { index: 65_537, nestedResultIndex: 65_538 } },
            { $kind: 'NestedResult', NestedResult: [1, 2] },
        ],
    ] as const)('reads %s as an argument', (_what, kind, argument) => {
        const decoded = decodeViewOutputs(returning({ argument: { kind } }));

        expect(decoded.returnValues?.[0].argument).toEqual(argument);
    });

    it.each(
        (['bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'address', 'signer'] as const).map(
            (name) => [name, `${name}Tag` as const] as const,
        ),
    )('reads the %s type tag', (name, tagCase) => {
        const decoded = decodeViewOutputs(
            returning({ typeTag: { typeTag: { case: tagCase, value: true } } }),
        );

        expect(decoded.returnValues?.[0].typeTag).toEqual({ [name]: null });
    });

    it('reads vector and struct type tags, normalizing addresses', () => {
        const decoded = decodeViewOutputs(
            returning(
                {
                    typeTag: {
                        typeTag: {
                            case: 'vectorTag',
                            value: { innerType: { typeTag: { case: 'u8Tag', value: true } } },
                        },
                    },
                },
                {
                    typeTag: {
                        typeTag: { case: 'structTag', value: { structTag: '0x2::coin::Coin<u8>' } },
                    },
                },
            ),
        );

        expect(decoded.returnValues?.map((value) => value.typeTag)).toEqual([
            { vector: { u8: null } },
            {
                struct: {
                    address: FRAMEWORK,
                    module: 'coin',
                    name: 'Coin',
                    typeParams: [{ u8: null }],
                },
            },
        ]);
    });

    it('reads JSON like Rust prost_to_json', () => {
        const decoded = decodeViewOutputs(
            returning({
                json: {
                    kind: {
                        case: 'structValue',
                        value: {
                            fields: {
                                owner: { kind: { case: 'stringValue', value: FRAMEWORK } },
                                open: { kind: { case: 'boolValue', value: true } },
                                none: { kind: { case: 'nullValue', value: 0 } },
                                empty: {},
                                sizes: {
                                    kind: {
                                        case: 'listValue',
                                        value: {
                                            values: [
                                                { kind: { case: 'numberValue', value: 1 } },
                                                { kind: { case: 'numberValue', value: NaN } },
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
        );

        expect(decoded.returnValues?.[0].json).toEqual({
            owner: FRAMEWORK,
            open: true,
            none: null,
            empty: null,
            sizes: [1, null],
        });
    });

    it.each([
        ['an argument without a kind', { argument: {} }, "missing field 'argument.kind'"],
        [
            'an unknown argument',
            { argument: { kind: { case: 'unknown', value: {} } } },
            "invalid field 'argument.kind': unknown argument type",
        ],
        [
            'an input without its index',
            { argument: { kind: { case: 'input', value: {} } } },
            "missing field 'argument.input.index'",
        ],
        [
            'a result without its index',
            { argument: { kind: { case: 'result', value: {} } } },
            "missing field 'argument.result.index'",
        ],
        ['a type tag without a kind', { typeTag: {} }, "missing field 'type_tag'"],
        [
            'a vector tag without its inner type',
            { typeTag: { typeTag: { case: 'vectorTag', value: {} } } },
            "missing field 'type_tag.vector.inner_type'",
        ],
        [
            'a struct tag that is a primitive',
            { typeTag: { typeTag: { case: 'structTag', value: { structTag: 'u64' } } } },
            "invalid field 'type_tag.struct_tag': not a struct tag",
        ],
    ] as const)('names the field of %s', (_what, output, message) => {
        expect(() => decodeViewOutputs(returning(output))).toThrow(
            new ProtoConversionError(message),
        );
    });
});
