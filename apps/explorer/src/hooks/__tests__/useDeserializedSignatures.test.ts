// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import type { MultiSigStruct } from '@iota/iota-sdk/multisig';
import { parseMultiSigSignature } from '~/hooks/useDeserializedSignatures';

function bytes(length: number, firstByte: number): Uint8Array {
    const value = new Uint8Array(length);
    value[0] = firstByte;
    return value;
}

describe('parseMultiSigSignature', () => {
    it('keeps the policy and unsigned participants in a top-level signature group', () => {
        const multisig: MultiSigStruct = {
            sigs: [{ ED25519: bytes(64, 1) }, { ED25519: bytes(64, 2) }, { ED25519: bytes(64, 3) }],
            bitmap: 0b10101,
            multisig_pk: {
                threshold: 3,
                pk_map: [
                    { pubKey: { ED25519: bytes(32, 1) }, weight: 1 },
                    { pubKey: { ED25519: bytes(32, 2) }, weight: 1 },
                    { pubKey: { ED25519: bytes(32, 3) }, weight: 1 },
                    { pubKey: { ED25519: bytes(32, 4) }, weight: 1 },
                    { pubKey: { ED25519: bytes(32, 5) }, weight: 1 },
                ],
            },
        };

        const result = parseMultiSigSignature(multisig, bytes(100, 9));

        expect(result.signatureScheme).toBe('MultiSig');
        expect(result.multisig.threshold).toBe(3);
        expect(result.multisig.participants).toHaveLength(5);
        expect(result.multisig.participants.map(({ signed }) => signed)).toEqual([
            true,
            false,
            true,
            false,
            true,
        ]);
        expect(result.multisig.participants[0].signature).toEqual(bytes(64, 1));
        expect(result.multisig.participants[1].signature).toBeUndefined();
        expect(result.multisig.participants[0].weight).toBe(1);
        expect(result.address).toBe(result.multisig.address);
    });
});
