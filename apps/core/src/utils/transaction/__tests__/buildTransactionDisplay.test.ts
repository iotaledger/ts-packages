// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { describe, expect, it } from 'vitest';

import { buildTransactionDisplay } from '../buildTransactionDisplay';
import { narrateObjectChanges } from '../narrateObjectChanges';
import { type IotaObjectChangeWithDisplay } from '../../../types';

// ─── Address constants ────────────────────────────────────────────────────────

const SENDER = '0x1111111111111111111111111111111111111111111111111111111111111111';
const RECIPIENT = '0x2222222222222222222222222222222222222222222222222222222222222222';
const GAS_OBJECT_ID = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const NFT_OBJECT_ID = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const PACKAGE_ID = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

const NFT_TYPE = '0xabc::nft::MyNft';
const COIN_TYPE_IOTA = IOTA_TYPE_ARG;
const COIN_OBJECT_TYPE = `0x2::coin::Coin<${COIN_TYPE_IOTA}>`;

// ─── Mock builders ────────────────────────────────────────────────────────────

function makeEffects(overrides: Record<string, unknown> = {}) {
    return {
        messageVersion: 'v1' as const,
        status: { status: 'success' as const },
        executedEpoch: '1',
        gasUsed: {
            computationCost: '1000000',
            computationCostBurned: '0',
            storageCost: '500000',
            storageRebate: '400000',
            nonRefundableStorageFee: '0',
        },
        gasObject: {
            owner: { AddressOwner: SENDER },
            reference: { objectId: GAS_OBJECT_ID, digest: 'gas-digest', version: '5' },
        },
        ...overrides,
    };
}

function makeProgrammableTx(
    transactions: unknown[] = [{ TransferObjects: [[{ Input: 0 }], { Input: 1 }] }],
) {
    return {
        kind: 'ProgrammableTransaction' as const,
        inputs: [],
        transactions,
    };
}

function makeTx(
    overrides: Partial<IotaTransactionBlockResponse> = {},
): IotaTransactionBlockResponse {
    return {
        digest: 'test-digest',
        timestampMs: '1700000000000',
        transaction: {
            data: {
                sender: SENDER,
                gasData: {
                    budget: '1000000',
                    owner: SENDER,
                    payment: [],
                    price: '1000',
                },
                transaction: makeProgrammableTx(),
                messageVersion: 'v1',
            },
            txSignatures: [],
        },
        effects: makeEffects() as IotaTransactionBlockResponse['effects'],
        balanceChanges: [
            { owner: { AddressOwner: SENDER }, coinType: COIN_TYPE_IOTA, amount: '-11000000' },
            { owner: { AddressOwner: RECIPIENT }, coinType: COIN_TYPE_IOTA, amount: '10000000' },
        ],
        objectChanges: [],
        events: [],
        ...overrides,
    } as unknown as IotaTransactionBlockResponse;
}

// ─── narrateObjectChanges ─────────────────────────────────────────────────────

describe('narrateObjectChanges', () => {
    it('classifies a transferred non-coin object from the perspective address as sent', () => {
        const change: IotaObjectChangeWithDisplay = {
            type: 'transferred',
            sender: SENDER,
            recipient: { AddressOwner: RECIPIENT },
            objectType: NFT_TYPE,
            objectId: NFT_OBJECT_ID,
            version: '1',
            digest: 'nft-digest',
        };

        const result = narrateObjectChanges([change], { currentAddress: SENDER });

        expect(result.sent).toHaveLength(1);
        expect(result.sent[0].recipient).toBe(RECIPIENT);
        expect(result.internal).toHaveLength(0);
    });

    it('classifies a transferred coin object from the perspective address as internal', () => {
        const change: IotaObjectChangeWithDisplay = {
            type: 'transferred',
            sender: SENDER,
            recipient: { AddressOwner: RECIPIENT },
            objectType: COIN_OBJECT_TYPE,
            objectId: NFT_OBJECT_ID,
            version: '1',
            digest: 'coin-digest',
        };

        const result = narrateObjectChanges([change], { currentAddress: SENDER });

        expect(result.sent).toHaveLength(0);
        expect(result.internal).toHaveLength(1);
    });

    it('classifies a self-transfer of a non-coin object as internal', () => {
        const change: IotaObjectChangeWithDisplay = {
            type: 'transferred',
            sender: SENDER,
            recipient: { AddressOwner: SENDER },
            objectType: NFT_TYPE,
            objectId: NFT_OBJECT_ID,
            version: '1',
            digest: 'nft-digest',
        };

        const result = narrateObjectChanges([change], { currentAddress: SENDER });

        expect(result.sent).toHaveLength(0);
        expect(result.internal).toHaveLength(1);
    });

    it('classifies a created non-coin object owned by the perspective address as minted', () => {
        const change: IotaObjectChangeWithDisplay = {
            type: 'created',
            sender: SENDER,
            owner: { AddressOwner: SENDER },
            objectType: NFT_TYPE,
            objectId: NFT_OBJECT_ID,
            version: '1',
            digest: 'nft-digest',
        };

        const result = narrateObjectChanges([change], { currentAddress: SENDER });

        expect(result.minted).toHaveLength(1);
        expect(result.internal).toHaveLength(0);
    });

    it('classifies a created coin object as internal', () => {
        const change: IotaObjectChangeWithDisplay = {
            type: 'created',
            sender: SENDER,
            owner: { AddressOwner: SENDER },
            objectType: COIN_OBJECT_TYPE,
            objectId: NFT_OBJECT_ID,
            version: '1',
            digest: 'coin-digest',
        };

        const result = narrateObjectChanges([change], { currentAddress: SENDER });

        expect(result.minted).toHaveLength(0);
        expect(result.internal).toHaveLength(1);
    });

    it('classifies an unwrapped non-coin object owned by the perspective address as received', () => {
        const change: IotaObjectChangeWithDisplay = {
            type: 'unwrapped',
            sender: SENDER,
            owner: { AddressOwner: SENDER },
            objectType: NFT_TYPE,
            objectId: NFT_OBJECT_ID,
            version: '1',
            digest: 'nft-digest',
        };

        const result = narrateObjectChanges([change], { currentAddress: SENDER });

        expect(result.received).toHaveLength(1);
        expect(result.internal).toHaveLength(0);
    });

    it('classifies a published package as published', () => {
        const change: IotaObjectChangeWithDisplay = {
            type: 'published',
            packageId: PACKAGE_ID,
            version: '1',
            digest: 'pkg-digest',
            modules: ['my_module'],
        };

        const result = narrateObjectChanges([change], { currentAddress: SENDER });

        expect(result.published).toHaveLength(1);
    });

    it('classifies mutated coin, deleted, and wrapped changes as internal', () => {
        const mutated: IotaObjectChangeWithDisplay = {
            type: 'mutated',
            sender: SENDER,
            owner: { AddressOwner: SENDER },
            objectType: COIN_OBJECT_TYPE,
            objectId: GAS_OBJECT_ID,
            previousVersion: '4',
            version: '5',
            digest: 'gas-digest',
        };
        const deleted: IotaObjectChangeWithDisplay = {
            type: 'deleted',
            sender: SENDER,
            objectType: NFT_TYPE,
            objectId: NFT_OBJECT_ID,
            version: '2',
        };
        const wrapped: IotaObjectChangeWithDisplay = {
            type: 'wrapped',
            sender: SENDER,
            objectType: NFT_TYPE,
            objectId: NFT_OBJECT_ID,
            version: '3',
        };

        const result = narrateObjectChanges([mutated, deleted, wrapped], {
            currentAddress: SENDER,
        });

        expect(result.internal).toHaveLength(3);
        expect(result.received).toHaveLength(0);
        expect(result.sent).toHaveLength(0);
        expect(result.minted).toHaveLength(0);
        expect(result.published).toHaveLength(0);
        expect(result.kept).toHaveLength(0);
    });

    it('classifies a mutated non-coin object owned by the perspective address as kept', () => {
        const mutatedNft: IotaObjectChangeWithDisplay = {
            type: 'mutated',
            sender: SENDER,
            owner: { AddressOwner: SENDER },
            objectType: NFT_TYPE,
            objectId: NFT_OBJECT_ID,
            previousVersion: '4',
            version: '5',
            digest: 'nft-digest',
            display: { data: { name: 'Evolved Wizard' } },
        };

        const result = narrateObjectChanges([mutatedNft], {
            currentAddress: SENDER,
            gasObjectId: GAS_OBJECT_ID,
        });

        expect(result.kept).toHaveLength(1);
        expect(result.kept[0].name).toBe('Evolved Wizard');
        expect(result.internal).toHaveLength(0);
    });

    it('puts the gas coin in internal even if it is the kept-bucket objectType', () => {
        // Gas coin is mutated non-coin in theory impossible (it IS a coin) but guard is gasObjectId
        const gasNft: IotaObjectChangeWithDisplay = {
            type: 'mutated',
            sender: SENDER,
            owner: { AddressOwner: SENDER },
            objectType: NFT_TYPE,
            objectId: GAS_OBJECT_ID, // same as gasObjectId
            previousVersion: '4',
            version: '5',
            digest: 'gas-digest',
        };

        const result = narrateObjectChanges([gasNft], {
            currentAddress: SENDER,
            gasObjectId: GAS_OBJECT_ID,
        });

        expect(result.kept).toHaveLength(0);
        expect(result.internal).toHaveLength(1);
    });

    it('puts a mutated non-coin owned by a different address in internal', () => {
        const mutated: IotaObjectChangeWithDisplay = {
            type: 'mutated',
            sender: SENDER,
            owner: { AddressOwner: RECIPIENT },
            objectType: NFT_TYPE,
            objectId: NFT_OBJECT_ID,
            previousVersion: '1',
            version: '2',
            digest: 'nft-digest',
        };

        const result = narrateObjectChanges([mutated], { currentAddress: SENDER });

        expect(result.kept).toHaveLength(0);
        expect(result.internal).toHaveLength(1);
    });

    it('extracts display name when present', () => {
        const change: IotaObjectChangeWithDisplay = {
            type: 'created',
            sender: SENDER,
            owner: { AddressOwner: SENDER },
            objectType: NFT_TYPE,
            objectId: NFT_OBJECT_ID,
            version: '1',
            digest: 'nft-digest',
            display: { data: { name: 'Crystal Miner' } },
        };

        const result = narrateObjectChanges([change], { currentAddress: SENDER });

        expect(result.minted[0].name).toBe('Crystal Miner');
    });

    it('uses sender as perspective when currentAddress is absent', () => {
        const change: IotaObjectChangeWithDisplay = {
            type: 'transferred',
            sender: SENDER,
            recipient: { AddressOwner: RECIPIENT },
            objectType: NFT_TYPE,
            objectId: NFT_OBJECT_ID,
            version: '1',
            digest: 'nft-digest',
        };

        const result = narrateObjectChanges([change], { sender: SENDER });

        expect(result.sent).toHaveLength(1);
    });
});

// ─── buildTransactionDisplay ──────────────────────────────────────────────────

describe('buildTransactionDisplay', () => {
    it('derives kind=send when currentAddress is the sender and tx has no contract calls', () => {
        const tx = makeTx();
        const result = buildTransactionDisplay(tx, [], [], SENDER);
        expect(result.kind).toBe('send');
        expect(result.status).toBe('success');
    });

    it('derives kind=receive when currentAddress is the recipient', () => {
        const tx = makeTx();
        const result = buildTransactionDisplay(tx, [], [], RECIPIENT);
        expect(result.kind).toBe('receive');
    });

    it('derives kind=contract-call for a ProgrammableTransaction with MoveCall', () => {
        const tx = makeTx({
            transaction: {
                data: {
                    sender: SENDER,
                    gasData: { budget: '1000000', owner: SENDER, payment: [], price: '1000' },
                    transaction: makeProgrammableTx([
                        {
                            MoveCall: {
                                package: PACKAGE_ID,
                                module: 'counter',
                                function: 'increment',
                                arguments: [],
                                typeArguments: [],
                            },
                        },
                    ]),
                    messageVersion: 'v1',
                },
                txSignatures: [],
            },
        } as unknown as Partial<IotaTransactionBlockResponse>);

        const result = buildTransactionDisplay(tx, [], [], SENDER);
        expect(result.kind).toBe('contract-call');
    });

    it('derives kind=system for a non-ProgrammableTransaction kind', () => {
        const tx = makeTx({
            transaction: {
                data: {
                    sender: SENDER,
                    gasData: { budget: '1000000', owner: SENDER, payment: [], price: '1000' },
                    transaction: { kind: 'ConsensusCommitPrologueV1' } as unknown,
                    messageVersion: 'v1',
                },
                txSignatures: [],
            },
        } as unknown as Partial<IotaTransactionBlockResponse>);

        const result = buildTransactionDisplay(tx, [], [], SENDER);
        expect(result.kind).toBe('system');
    });

    it('keeps kind=send when a send tx fails (status drives the failure indicator)', () => {
        const tx = makeTx({
            effects: makeEffects({
                status: { status: 'failure', error: 'Abort code 7' },
            }) as IotaTransactionBlockResponse['effects'],
        });

        const result = buildTransactionDisplay(tx, [], [], SENDER);
        // A failed send: kind still reflects the action; status/failureMessage carry the error.
        expect(result.kind).toBe('send');
        expect(result.status).toBe('failure');
        expect(result.failureMessage).toBe('Abort code 7');
    });

    it('derives kind=failed for a generic (contract-call) tx that fails', () => {
        const tx = makeTx({
            transaction: {
                data: {
                    sender: SENDER,
                    gasData: { budget: '1000000', owner: SENDER, payment: [], price: '1000' },
                    transaction: makeProgrammableTx([
                        {
                            MoveCall: {
                                package: PACKAGE_ID,
                                module: 'counter',
                                function: 'increment',
                                arguments: [],
                                typeArguments: [],
                            },
                        },
                    ]),
                    messageVersion: 'v1',
                },
                txSignatures: [],
            },
            effects: makeEffects({
                status: { status: 'failure', error: 'Move abort' },
            }) as IotaTransactionBlockResponse['effects'],
        } as unknown as Partial<IotaTransactionBlockResponse>);

        const result = buildTransactionDisplay(tx, [], [], SENDER);
        expect(result.kind).toBe('failed');
        expect(result.status).toBe('failure');
        expect(result.failureMessage).toBe('Move abort');
    });

    it('derives kind=stake when a StakingRequestEvent is present', () => {
        const tx = makeTx({
            events: [
                {
                    type: '0x3::validator::StakingRequestEvent',
                    transactionModule: 'iota_system',
                    id: { txDigest: 'test-digest', eventSeq: '0' },
                    packageId: '0x3',
                    sender: SENDER,
                    parsedJson: {},
                    bcs: '',
                    bcsEncoding: 'base58' as const,
                },
            ],
        });

        const result = buildTransactionDisplay(tx, [], [], SENDER);
        expect(result.kind).toBe('stake');
    });

    it('sets primary to the most significant balance change for currentAddress', () => {
        const tx = makeTx({
            balanceChanges: [
                { owner: { AddressOwner: SENDER }, coinType: COIN_TYPE_IOTA, amount: '-11000000' },
                {
                    owner: { AddressOwner: RECIPIENT },
                    coinType: COIN_TYPE_IOTA,
                    amount: '10000000',
                },
            ],
        });

        const result = buildTransactionDisplay(tx, [], [], SENDER);
        expect(result.primary).toEqual({ coinType: COIN_TYPE_IOTA, amount: -11000000n });
    });

    it('picks IOTA over another coin of equal absolute value as primary', () => {
        const OTHER_COIN = '0xdead::token::TOKEN';
        const tx = makeTx({
            balanceChanges: [
                { owner: { AddressOwner: SENDER }, coinType: OTHER_COIN, amount: '5000000' },
                { owner: { AddressOwner: SENDER }, coinType: COIN_TYPE_IOTA, amount: '-5000000' },
            ],
        });

        const result = buildTransactionDisplay(tx, [], [], SENDER);
        expect(result.primary?.coinType).toBe(COIN_TYPE_IOTA);
    });

    it('collects non-self owners as counterparties with direction=to for sends', () => {
        const tx = makeTx();
        const result = buildTransactionDisplay(tx, [], [], SENDER);

        expect(result.counterparties).toHaveLength(1);
        expect(result.counterparties[0].address).toBe(RECIPIENT);
        expect(result.counterparties[0].direction).toBe('to');
        expect(result.counterparties[0].amounts).toEqual([
            { coinType: COIN_TYPE_IOTA, amount: 10000000n },
        ]);
    });

    it('marks counterparties as direction=from for receives', () => {
        const tx = makeTx();
        const result = buildTransactionDisplay(tx, [], [], RECIPIENT);

        expect(result.counterparties).toHaveLength(1);
        expect(result.counterparties[0].address).toBe(SENDER);
        expect(result.counterparties[0].direction).toBe('from');
    });

    it('handles multiple recipients correctly', () => {
        const RECIPIENT2 = '0x3333333333333333333333333333333333333333333333333333333333333333';
        const tx = makeTx({
            balanceChanges: [
                { owner: { AddressOwner: SENDER }, coinType: COIN_TYPE_IOTA, amount: '-21000000' },
                {
                    owner: { AddressOwner: RECIPIENT },
                    coinType: COIN_TYPE_IOTA,
                    amount: '10000000',
                },
                {
                    owner: { AddressOwner: RECIPIENT2 },
                    coinType: COIN_TYPE_IOTA,
                    amount: '10000000',
                },
            ],
        });

        const result = buildTransactionDisplay(tx, [], [], SENDER);

        expect(result.counterparties).toHaveLength(2);
        expect(result.counterparties.every((c) => c.direction === 'to')).toBe(true);
    });

    it('computes fee from gas data', () => {
        const tx = makeTx();
        const result = buildTransactionDisplay(tx, [], [], SENDER);

        expect(result.fee).toEqual({
            computation: 1000000n,
            storage: 500000n,
            rebate: 400000n,
            net: 1100000n, // 1000000 + 500000 - 400000
        });
    });

    it('includes digest and timestampMs from the transaction', () => {
        const tx = makeTx();
        const result = buildTransactionDisplay(tx, [], [], SENDER);

        expect(result.digest).toBe('test-digest');
        expect(result.timestampMs).toBe('1700000000000');
    });

    it('uses sender perspective when currentAddress is absent', () => {
        const tx = makeTx();
        const result = buildTransactionDisplay(tx, [], []);

        // Without currentAddress, uses sender perspective → RECIPIENT is counterparty
        expect(result.counterparties).toHaveLength(1);
        expect(result.counterparties[0].address).toBe(RECIPIENT);
        expect(result.primary?.coinType).toBe(COIN_TYPE_IOTA);
    });

    it('populates narratedObjectChanges from objectChangesWithDisplay', () => {
        const nftChange: IotaObjectChangeWithDisplay = {
            type: 'transferred',
            sender: SENDER,
            recipient: { AddressOwner: RECIPIENT },
            objectType: NFT_TYPE,
            objectId: NFT_OBJECT_ID,
            version: '1',
            digest: 'nft-digest',
            display: { data: { name: 'My NFT' } },
        };

        const tx = makeTx();
        const result = buildTransactionDisplay(tx, [nftChange], [], SENDER);

        expect(result.narratedObjectChanges.sent).toHaveLength(1);
        expect(result.narratedObjectChanges.sent[0].name).toBe('My NFT');
        expect(result.narratedObjectChanges.sent[0].recipient).toBe(RECIPIENT);
    });

    it('returns empty counterparties and no primary when there are no balance changes', () => {
        const tx = makeTx({ balanceChanges: [] });
        const result = buildTransactionDisplay(tx, [], [], SENDER);

        expect(result.counterparties).toHaveLength(0);
        expect(result.primary).toBeUndefined();
    });

    it('populates ptbRecognition for a ProgrammableTransaction', () => {
        const tx = makeTx(); // default makeTx uses ProgrammableTransaction
        const result = buildTransactionDisplay(tx, [], [], SENDER);

        expect(result.ptbRecognition).toBeDefined();
    });

    it('omits ptbRecognition for a system transaction', () => {
        const tx = makeTx({
            transaction: {
                data: {
                    sender: SENDER,
                    gasData: { budget: '1000000', owner: SENDER, payment: [], price: '1000' },
                    transaction: { kind: 'ConsensusCommitPrologueV1' } as unknown,
                    messageVersion: 'v1',
                },
                txSignatures: [],
            },
        } as unknown as Partial<IotaTransactionBlockResponse>);

        const result = buildTransactionDisplay(tx, [], [], SENDER);

        expect(result.ptbRecognition).toBeUndefined();
    });

    it('ptbRecognition includes coin-send rows from balance changes', () => {
        const tx = makeTx({
            balanceChanges: [
                { owner: { AddressOwner: SENDER }, coinType: COIN_TYPE_IOTA, amount: '-11000000' },
                {
                    owner: { AddressOwner: RECIPIENT },
                    coinType: COIN_TYPE_IOTA,
                    amount: '10000000',
                },
            ],
        });

        const result = buildTransactionDisplay(tx, [], [], SENDER);

        expect(result.ptbRecognition?.recognized).toBe(true);
        const sendRow = result.ptbRecognition?.rows.find((r) => r.kind === 'coin-send');
        expect(sendRow).toBeDefined();
    });

    it('ptbRecognition is recognized=false when an unknown package MoveCall is present', () => {
        const tx = makeTx({
            transaction: {
                data: {
                    sender: SENDER,
                    gasData: { budget: '1000000', owner: SENDER, payment: [], price: '1000' },
                    transaction: makeProgrammableTx([
                        {
                            MoveCall: {
                                package: PACKAGE_ID,
                                module: 'swap',
                                function: 'execute',
                                arguments: [],
                                typeArguments: [],
                            },
                        },
                    ]),
                    messageVersion: 'v1',
                },
                txSignatures: [],
            },
            balanceChanges: [],
        } as unknown as Partial<IotaTransactionBlockResponse>);

        // PACKAGE_ID is not in the recognized packages list (empty)
        const result = buildTransactionDisplay(tx, [], [], SENDER);

        expect(result.ptbRecognition?.recognized).toBe(false);
    });
});
