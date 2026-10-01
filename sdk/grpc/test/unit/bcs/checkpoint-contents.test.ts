// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fromBase64, fromHex, toHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { CheckpointContents } from '../../../src/bcs/checkpoint.js';
import { UserSignature } from '../../../src/bcs/signatures.js';
import { typeDigest } from '../../digest.js';

/**
 * The contents of the two checkpoints in `checkpoints.json`, with the digest
 * the header and summary commit to and what the checkpoint's own transaction
 * frames say about each transaction.
 */
interface CheckpointFixture {
    contentsDigest: string;
    contentsBcs: string;
    transactions: { digest: string; effectsDigest: string; signatures: string[] }[];
}

interface CheckpointsFixture {
    recent: CheckpointFixture;
    endOfEpoch: CheckpointFixture;
}

const fixture: CheckpointsFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/checkpoints.json'), 'utf8'),
);

function frameSignatures(transaction: CheckpointFixture['transactions'][number]): string[] {
    return transaction.signatures.map((signature) => UserSignature.parse(fromHex(signature)));
}

describe.each([
    ['recent', fixture.recent, fixture.recent.transactions],
    // The end-of-epoch transaction is left out here and covered below.
    ['end-of-epoch', fixture.endOfEpoch, fixture.endOfEpoch.transactions.slice(0, -1)],
] as const)('CheckpointContents, %s mainnet checkpoint', (_, expected, signedTransactions) => {
    const bytes = fromHex(expected.contentsBcs);
    const decoded = CheckpointContents.parse(bytes);
    const contents = decoded.V1!;

    it('is the V1 variant', () => {
        expect(decoded.$kind).toBe('V1');
    });

    it('hashes to the contents digest the summary commits to', () => {
        expect(
            typeDigest('CheckpointContents', CheckpointContents.serialize(decoded).toBytes()),
        ).toBe(expected.contentsDigest);
    });

    it('lists the transaction and effects digests of the checkpoint, in order', () => {
        expect(contents.digests).toEqual(
            expected.transactions.map(({ digest, effectsDigest }) => ({
                transaction: digest,
                effects: effectsDigest,
            })),
        );
    });

    it('holds one signature list per transaction', () => {
        expect(contents.signatures).toHaveLength(contents.digests.length);
    });

    it('holds the user signatures the transaction frames carry', () => {
        expect(contents.signatures.slice(0, signedTransactions.length)).toEqual(
            signedTransactions.map(frameSignatures),
        );
    });

    it('re-encodes to the same bytes', () => {
        expect(toHex(CheckpointContents.serialize(decoded).toBytes())).toBe(expected.contentsBcs);
    });
});

describe('CheckpointContents, end-of-epoch transaction', () => {
    const contents = CheckpointContents.parse(fromHex(fixture.endOfEpoch.contentsBcs)).V1!;
    const frame = fixture.endOfEpoch.transactions.at(-1)!;

    it('is committed with no signatures', () => {
        expect(contents.signatures.at(-1)).toEqual([]);
    });

    it('still gets a zeroed placeholder signature in its GetCheckpoint transaction frame', () => {
        const [placeholder] = frameSignatures(frame);

        expect(frameSignatures(frame)).toHaveLength(1);
        expect(fromBase64(placeholder).every((byte) => byte === 0)).toBe(true);
    });
});

describe('CheckpointContents', () => {
    it('rejects a version it does not know', () => {
        const bytes = fromHex(fixture.recent.contentsBcs);
        bytes[0] = 0x01;

        expect(() => CheckpointContents.parse(bytes)).toThrow();
    });

    it('rejects truncated bytes', () => {
        const bytes = fromHex(fixture.recent.contentsBcs);

        expect(() => CheckpointContents.parse(bytes.slice(0, -1))).toThrow();
    });
});
