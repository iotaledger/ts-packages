// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
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
    objectIdOf,
} from '../../../src/bcs/decode.js';
import { ExecutionError } from '../../../src/bcs/execution-error.js';
import { ProtoConversionError } from '../../../src/errors.js';
import {
    CheckpointContentsSchema,
    CheckpointSummarySchema,
} from '../../../src/proto/iota/grpc/v1/checkpoint_pb.js';
import { EventSchema } from '../../../src/proto/iota/grpc/v1/event_pb.js';
import { ObjectSchema } from '../../../src/proto/iota/grpc/v1/object_pb.js';
import {
    UserSignatureSchema,
    ValidatorAggregatedSignatureSchema,
} from '../../../src/proto/iota/grpc/v1/signatures_pb.js';
import { ExecutionErrorSchema } from '../../../src/proto/iota/grpc/v1/transaction_execution_service_pb.js';
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
