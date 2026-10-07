// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fromHex, toHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs';
import { TransactionDataBuilder } from '../../../src/transactions/TransactionData';

interface TransactionsFixture {
    transactions: {
        network: string;
        checkpoint: string;
        kindTag: number;
        digest: string;
        transactionBcs: string;
    }[];
    transactionKinds: { name: string; bcs: string }[];
}

const fixture: TransactionsFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, 'transactions.fixture.json'), 'utf8'),
);

/** Variant names in tag order. Tag 0 keeps the SDK's name, the rest follow the node's Rust type. */
const TRANSACTION_KINDS = [
    'ProgrammableTransaction',
    'Genesis',
    'ConsensusCommitPrologueV1',
    'AuthenticatorStateUpdateV1Deprecated',
    'EndOfEpoch',
    'RandomnessStateUpdate',
    'TransactionDenyRulesUpdate',
];

describe.each(fixture.transactions.map((tx) => [TRANSACTION_KINDS[tx.kindTag], tx] as const))(
    'TransactionData, %s',
    (kind, tx) => {
        const bytes = fromHex(tx.transactionBcs);
        const decoded = bcs.TransactionData.parse(bytes);

        it('decodes to the kind its tag names', () => {
            expect(decoded.V1!.kind.$kind).toBe(kind);
        });

        it('hashes to the digest the node computed', () => {
            expect(TransactionDataBuilder.getDigestFromBytes(bytes)).toBe(tx.digest);
        });

        it('re-encodes to the same bytes', () => {
            expect(toHex(bcs.TransactionData.serialize(decoded).toBytes())).toBe(tx.transactionBcs);
        });
    },
);

describe.each(fixture.transactionKinds.map(({ name, bcs }) => [name, bcs] as const))(
    'TransactionData, synthetic %s',
    (name, hex) => {
        const decoded = bcs.TransactionData.parse(fromHex(hex));

        it('decodes to the kind it was built for', () => {
            expect(decoded.V1!.kind.$kind).toBe(name);
        });

        it('re-encodes to the same bytes', () => {
            expect(toHex(bcs.TransactionData.serialize(decoded).toBytes())).toBe(hex);
        });
    },
);

describe('TransactionKind', () => {
    it('has one variant per tag the node defines', () => {
        for (const [tag, name] of TRANSACTION_KINDS.entries()) {
            const synthetic = fixture.transactionKinds.find((kind) => kind.name === name);
            const live = fixture.transactions.find((tx) => tx.kindTag === tag);

            expect(synthetic ?? live, `no fixture for ${name}`).toBeDefined();
        }
    });

    it('rejects a tag past the last kind', () => {
        const bytes = fromHex(fixture.transactions[0].transactionBcs);
        bytes[1] = TRANSACTION_KINDS.length;

        expect(() => bcs.TransactionData.parse(bytes)).toThrow();
    });

    it('decodes every end-of-epoch kind the synthetic EndOfEpoch carries', () => {
        const hex = fixture.transactionKinds.find(({ name }) => name === 'EndOfEpoch')!.bcs;
        const kinds = bcs.TransactionData.parse(fromHex(hex)).V1!.kind.EndOfEpoch!;

        expect(kinds.map((kind) => kind.$kind)).toEqual([
            'ChangeEpoch',
            'ChangeEpochV2',
            'ChangeEpochV3',
            'ChangeEpochV4',
            'TransactionDenyRulesCreate',
        ]);
    });

    it('decodes a genesis object and event', () => {
        const hex = fixture.transactionKinds.find(({ name }) => name === 'Genesis')!.bcs;
        const genesis = bcs.TransactionData.parse(fromHex(hex)).V1!.kind.Genesis!;

        expect(genesis.objects).toHaveLength(1);
        expect(genesis.objects[0].RawObject!.data.$kind).toBe('Struct');
        expect(genesis.events).toHaveLength(1);
    });
});

describe('TransactionKind, end-of-epoch transaction', () => {
    const tx = fixture.transactions.find(({ kindTag }) => kindTag === 4)!;
    const [changeEpoch] = bcs.TransactionData.parse(fromHex(tx.transactionBcs)).V1!.kind
        .EndOfEpoch!;

    it('is a ChangeEpochV4 opening epoch 514', () => {
        expect(changeEpoch.$kind).toBe('ChangeEpochV4');
        expect(changeEpoch.ChangeEpochV4!.epoch).toBe('514');
    });
});
