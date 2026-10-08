// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { create } from '@bufbuild/protobuf';
import { fromHex } from '@iota/bcs';
import { bcs } from '@iota/iota-sdk/bcs';
import { verifyTransactionSignature } from '@iota/iota-sdk/verify';
import { describe, expect, it } from 'vitest';

import { decodeCheckpointTransaction } from '../../../src/bcs/decode.js';
import { TransactionEvents } from '../../../src/bcs/event.js';
import { IotaObject } from '../../../src/bcs/object.js';
import { ProtoConversionError } from '../../../src/errors.js';
import { ObjectsSchema } from '../../../src/proto/iota/grpc/v1/object_pb.js';
import type { ExecutedTransaction } from '../../../src/proto/iota/grpc/v1/transaction_pb.js';
import { ExecutedTransactionSchema } from '../../../src/proto/iota/grpc/v1/transaction_pb.js';
import { typeDigest } from '../../digest.js';

interface CheckpointTransactionFixture {
    digest: string;
    transactionBcs: string;
    signatures: string[];
    effectsDigest: string;
    effectsBcs: string;
    eventsDigest: string;
    events: string[];
    inputObjects: string[];
    outputObjects: string[];
}

const fixture: CheckpointTransactionFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/checkpoint-transaction.json'), 'utf8'),
);

const bcsData = (hex: string) => ({ bcs: { data: fromHex(hex) } });

function executed(overrides: Partial<ExecutedTransaction> = {}): ExecutedTransaction {
    const message = create(ExecutedTransactionSchema, {
        transaction: bcsData(fixture.transactionBcs),
        signatures: { signatures: fixture.signatures.map(bcsData) },
        effects: bcsData(fixture.effectsBcs),
        events: { events: { events: fixture.events.map(bcsData) } },
        inputObjects: { objects: fixture.inputObjects.map(bcsData) },
        outputObjects: { objects: fixture.outputObjects.map(bcsData) },
    });
    return Object.assign(message, overrides);
}

const objectDigest = (object: typeof IotaObject.$inferType) =>
    typeDigest('Object', IotaObject.serialize(object).toBytes());

describe('decodeCheckpointTransaction', () => {
    const decoded = decodeCheckpointTransaction(executed());
    const effects = decoded.effects.V1!;
    const transactionBytes = fromHex(fixture.transactionBcs);

    it('decodes effects that name the transaction and its events', () => {
        expect(typeDigest('TransactionEffects', fromHex(fixture.effectsBcs))).toBe(
            fixture.effectsDigest,
        );
        expect(effects.transactionDigest).toBe(fixture.digest);
        expect(effects.eventsDigest).toBe(fixture.eventsDigest);
    });

    it('decodes the events the effects commit to', () => {
        expect(
            typeDigest('TransactionEvents', TransactionEvents.serialize(decoded.events!).toBytes()),
        ).toBe(fixture.eventsDigest);
    });

    it('decodes signatures from the sender and the gas sponsor', async () => {
        const { sender, gasData } = decoded.transaction.transaction.V1!;
        const signers = await Promise.all(
            decoded.transaction.signatures.map(async (signature) =>
                (await verifyTransactionSignature(transactionBytes, signature)).toIotaAddress(),
            ),
        );

        expect(signers.sort()).toEqual([...new Set([sender, gasData.owner])].sort());
    });

    it('decodes the output objects the effects wrote', () => {
        const written = new Set(
            effects.changedObjects.flatMap(([, change]) =>
                change.outputState.ObjectWrite ? [change.outputState.ObjectWrite[0]] : [],
            ),
        );

        expect(decoded.outputObjects).toHaveLength(fixture.outputObjects.length);
        expect(decoded.outputObjects.map((object) => written.has(objectDigest(object)))).toEqual(
            decoded.outputObjects.map(() => true),
        );
    });

    it('decodes the input objects the effects changed', () => {
        const read = new Set(
            effects.changedObjects.flatMap(([, change]) =>
                change.inputState.Exist ? [change.inputState.Exist[0][1]] : [],
            ),
        );

        expect(decoded.inputObjects).toHaveLength(fixture.inputObjects.length);
        expect(decoded.inputObjects.map((object) => read.has(objectDigest(object)))).toEqual(
            decoded.inputObjects.map(() => true),
        );
    });

    it('returns null events when the read mask left them out', () => {
        expect(decodeCheckpointTransaction(executed({ events: undefined })).events).toBeNull();
    });

    it.each(['transaction', 'signatures', 'effects', 'inputObjects', 'outputObjects'] as const)(
        'fails when %s is absent',
        (part) => {
            const field = part.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

            expect(() => decodeCheckpointTransaction(executed({ [part]: undefined }))).toThrow(
                new ProtoConversionError(`missing field '${field}'`),
            );
        },
    );

    it('names the part that failed to decode', () => {
        const objects = fixture.outputObjects.map(bcsData);
        objects[1] = bcsData(`${fixture.outputObjects[1]}00`);

        expect(() =>
            decodeCheckpointTransaction(
                executed({ outputObjects: create(ObjectsSchema, { objects }) }),
            ),
        ).toThrow(
            new ProtoConversionError(
                "invalid field 'output_objects.objects[1].bcs': trailing bytes",
            ),
        );
    });

    it('decodes the transaction as TransactionData', () => {
        expect(bcs.TransactionData.serialize(decoded.transaction.transaction).toBytes()).toEqual(
            transactionBytes,
        );
    });
});
