// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bcs, fromHex, toHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { VersionedValidatorAggregatedSignature } from '../../../src/bcs/signatures.js';

/** The validator quorum signatures of the two checkpoints in `checkpoints.json`. */
interface CheckpointsFixture {
    recent: { epoch: string; signatureBcs: string };
    endOfEpoch: { epoch: string; signatureBcs: string };
}

const fixture: CheckpointsFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/checkpoints.json'), 'utf8'),
);

/** Version tag plus the `u64` epoch. */
const SIGNATURE_OFFSET = 1 + 8;
const BLS12381_SIGNATURE_LENGTH = 48;

/** The first 16 bits of a serialized `RoaringBitmap`, with and without run containers. */
const ROARING_COOKIES = [12346, 12347];

describe.each([
    ['recent', fixture.recent],
    ['end-of-epoch', fixture.endOfEpoch],
] as const)('VersionedValidatorAggregatedSignature, %s mainnet checkpoint', (_, expected) => {
    const bytes = fromHex(expected.signatureBcs);
    const decoded = VersionedValidatorAggregatedSignature.parse(bytes);
    const signature = decoded.V1!;

    it('is the V1 variant', () => {
        expect(decoded.$kind).toBe('V1');
    });

    it('is signed for the epoch of the checkpoint it certifies', () => {
        expect(signature.epoch).toBe(expected.epoch);
    });

    it('reads the BLS signature as 48 bytes with no length prefix', () => {
        expect(toHex(signature.signature)).toBe(
            toHex(bytes.slice(SIGNATURE_OFFSET, SIGNATURE_OFFSET + BLS12381_SIGNATURE_LENGTH)),
        );
    });

    it('keeps the signer bitmap as the serialized RoaringBitmap that fills the rest', () => {
        const prefix = bcs.uleb128().serialize(signature.bitmap.length).toBytes();
        const start = SIGNATURE_OFFSET + BLS12381_SIGNATURE_LENGTH + prefix.length;

        expect(toHex(bytes.slice(start))).toBe(toHex(signature.bitmap));
        expect(ROARING_COOKIES).toContain(signature.bitmap[0] | (signature.bitmap[1] << 8));
    });

    it('re-encodes to the same bytes', () => {
        expect(toHex(VersionedValidatorAggregatedSignature.serialize(decoded).toBytes())).toBe(
            expected.signatureBcs,
        );
    });
});

describe('VersionedValidatorAggregatedSignature', () => {
    it('rejects a version it does not know', () => {
        const bytes = fromHex(fixture.recent.signatureBcs);
        bytes[0] = 0x01;

        expect(() => VersionedValidatorAggregatedSignature.parse(bytes)).toThrow();
    });

    it('rejects truncated bytes', () => {
        const bytes = fromHex(fixture.recent.signatureBcs);

        expect(() => VersionedValidatorAggregatedSignature.parse(bytes.slice(0, -1))).toThrow();
    });
});
