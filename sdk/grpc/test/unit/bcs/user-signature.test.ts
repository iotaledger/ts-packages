// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bcs, fromBase64, fromHex, toBase64, toHex } from '@iota/bcs';
import { bcs as iotaBcs } from '@iota/iota-sdk/bcs';
import { parseSerializedSignature, SIGNATURE_FLAG_TO_SCHEME } from '@iota/iota-sdk/cryptography';
import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { MultiSigPublicKey } from '@iota/iota-sdk/multisig';
import { verifyTransactionSignature } from '@iota/iota-sdk/verify';
import { describe, expect, it } from 'vitest';

import { UserSignature } from '../../../src/bcs/signatures.js';

/**
 * One live programmable transaction per signature scheme seen on the network,
 * with the TransactionData BCS its signatures sign and the UserSignature BCS
 * of each. The Ed25519 one is sponsored, so it carries two signatures.
 */
interface UserSignaturesFixture {
    capturedAt: string;
    transactions: {
        flag: number;
        network: string;
        checkpoint: string;
        transaction: string;
        transactionBcs: string;
        signatures: string[];
    }[];
}

const fixture: UserSignaturesFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/user-signatures.json'), 'utf8'),
);

/** The sender, plus the gas owner when a sponsor pays: the addresses that must sign. */
function requiredSigners(transactionBcs: Uint8Array): string[] {
    const { sender, gasData } = iotaBcs.TransactionData.parse(transactionBcs).V1!;
    return [...new Set([sender, gasData.owner])];
}

/** The `bytes` length prefix, which grows to two bytes from 128 bytes of signature on. */
function lengthPrefix(signature: Uint8Array): Uint8Array {
    return bcs.uleb128().serialize(signature.length).toBytes();
}

describe.each(
    fixture.transactions.map((tx) => [SIGNATURE_FLAG_TO_SCHEME[tx.flag as 0], tx] as const),
)('UserSignature, %s', (scheme, tx) => {
    const transactionBcs = fromHex(tx.transactionBcs);
    const signers = requiredSigners(transactionBcs);

    it('is signed by exactly the sender and the gas sponsor', async () => {
        const addresses = await Promise.all(
            tx.signatures.map(async (expected) => {
                const signature = UserSignature.parse(fromHex(expected));
                return (
                    await verifyTransactionSignature(transactionBcs, signature)
                ).toIotaAddress();
            }),
        );

        expect(addresses.sort()).toEqual([...signers].sort());
    });

    describe.each(tx.signatures.map((signature, index) => [index, signature] as const))(
        `${tx.network} transaction ${tx.transaction}, signature %i`,
        (_, expected) => {
            const bytes = fromHex(expected);
            const signature = UserSignature.parse(bytes);

            it('decodes to the serialized signature, base64-encoded', () => {
                const prefix = lengthPrefix(fromBase64(signature));

                expect(signature).toBe(toBase64(bytes.slice(prefix.length)));
            });

            it('carries the scheme flag the SDK reads', () => {
                expect(parseSerializedSignature(signature).signatureScheme).toBe(scheme);
            });

            it('verifies against the transaction it signs', async () => {
                const publicKey = await verifyTransactionSignature(transactionBcs, signature);

                expect(signers).toContain(publicKey.toIotaAddress());
            });

            it('re-encodes to the same bytes', () => {
                expect(toHex(UserSignature.serialize(signature).toBytes())).toBe(expected);
            });
        },
    );
});

describe('UserSignature', () => {
    const transactionBcs = fromHex(fixture.transactions[0].transactionBcs);

    it('round-trips a multisig signature past the one-byte length prefix', async () => {
        const keypairs = [new Ed25519Keypair(), new Ed25519Keypair()];
        const multisig = MultiSigPublicKey.fromPublicKeys({
            threshold: 2,
            publicKeys: keypairs.map((keypair) => ({
                publicKey: keypair.getPublicKey(),
                weight: 1,
            })),
        });
        const partials = await Promise.all(
            keypairs.map(
                async (keypair) => (await keypair.signTransaction(transactionBcs)).signature,
            ),
        );
        const combined = multisig.combinePartialSignatures(partials);

        const bytes = UserSignature.serialize(combined).toBytes();
        const prefix = lengthPrefix(fromBase64(combined));
        const decoded = UserSignature.parse(bytes);

        expect(prefix.length).toBe(2);
        expect(toHex(bytes.slice(0, 2))).toBe(toHex(prefix));
        expect(decoded).toBe(combined);
        await expect(
            verifyTransactionSignature(transactionBcs, decoded, {
                address: multisig.toIotaAddress(),
            }),
        ).resolves.toBeDefined();
    });

    it('accepts raw bytes as well as base64 when encoding', () => {
        const signature = UserSignature.parse(fromHex(fixture.transactions[0].signatures[0]));

        expect(toHex(UserSignature.serialize(fromBase64(signature)).toBytes())).toBe(
            fixture.transactions[0].signatures[0],
        );
    });

    it('rejects truncated bytes', () => {
        const bytes = fromHex(fixture.transactions[0].signatures[0]);

        expect(() => UserSignature.parse(bytes.slice(0, -1))).toThrow();
    });
});
