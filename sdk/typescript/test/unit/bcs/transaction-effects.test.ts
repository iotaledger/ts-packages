// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fromHex, toBase58, toHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs';
import { hashTypedData } from '../../../src/transactions/hash';

interface EffectsFixture {
    transactions: {
        network: string;
        failed: boolean;
        effectsDigest?: string;
        effectsBcs?: string;
    }[];
    liveErrorLength: number;
    executionErrors: { name: string; errorBcs: string }[];
}

const fixture: EffectsFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, 'transactions.fixture.json'), 'utf8'),
);

/** Effects start with the V1 tag and the Failure status, so the error starts at byte 2. */
const ERROR_OFFSET = 2;

/** The SDK spells `Canceled` the way its older variants do. */
function sdkVariantName(rustName: string): string {
    return rustName.replace('ExecutionCanceled', 'ExecutionCancelled');
}

const withEffects = fixture.transactions.filter((tx) => tx.effectsBcs);
const failure = fixture.transactions.find((tx) => tx.failed)!;

describe.each(withEffects.map((tx, index) => [index, tx] as const))(
    'TransactionEffects %i',
    (_, tx) => {
        const bytes = fromHex(tx.effectsBcs!);
        const decoded = bcs.TransactionEffects.parse(bytes);

        it('hashes to the digest the node computed', () => {
            expect(toBase58(hashTypedData('TransactionEffects', bytes))).toBe(tx.effectsDigest);
        });

        it('reports the status the effects carry', () => {
            expect(decoded.V1!.status.$kind).toBe(tx.failed ? 'Failed' : 'Success');
        });

        it('re-encodes to the same bytes', () => {
            expect(toHex(bcs.TransactionEffects.serialize(decoded).toBytes())).toBe(tx.effectsBcs);
        });
    },
);

describe('TransactionEffects, failed transaction', () => {
    it('failed with a MoveAbort', () => {
        const status = bcs.TransactionEffects.parse(fromHex(failure.effectsBcs!)).V1!.status;

        expect(status.Failed!.error.$kind).toBe('MoveAbort');
    });
});

describe.each(fixture.executionErrors.map(({ name, errorBcs }) => [name, errorBcs] as const))(
    'ExecutionFailureStatus, synthetic %s',
    (name, errorBcs) => {
        const live = fromHex(failure.effectsBcs!);
        const bytes = Uint8Array.from([
            ...live.slice(0, ERROR_OFFSET),
            ...fromHex(errorBcs),
            ...live.slice(ERROR_OFFSET + fixture.liveErrorLength),
        ]);
        const decoded = bcs.TransactionEffects.parse(bytes);
        const error = decoded.V1!.status.Failed!.error;
        const [variant, nested] = name.split('/');

        it('decodes to the variant it was built for', () => {
            expect(error.$kind).toBe(sdkVariantName(variant));
            if (nested) {
                expect(error.CommandArgumentError!.kind.$kind).toBe(nested);
            }
        });

        it('leaves the rest of the effects intact', () => {
            const original = bcs.TransactionEffects.parse(live).V1!;

            expect({ ...decoded.V1!, status: undefined }).toEqual({
                ...original,
                status: undefined,
            });
        });

        it('re-encodes to the same bytes', () => {
            expect(toHex(bcs.TransactionEffects.serialize(decoded).toBytes())).toBe(toHex(bytes));
        });
    },
);
