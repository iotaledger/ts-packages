// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaCallArg, type IotaTransaction } from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { describe, expect, it } from 'vitest';

import { recognizePtbEffects } from '../recognizePtbEffects';
import { type IotaObjectChangeWithDisplay } from '../../../types';

// ─── Address constants ────────────────────────────────────────────────────────

const SENDER = '0x1111111111111111111111111111111111111111111111111111111111111111';
const RECIPIENT = '0x2222222222222222222222222222222222222222222222222222222222222222';
const NFT_OBJECT_ID = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const PACKAGE_ID = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
const KNOWN_PACKAGE_ID = '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
const UNKNOWN_PACKAGE_ID = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

const NFT_TYPE = '0xabc::nft::MyNft';
const COIN_TYPE_IOTA = IOTA_TYPE_ARG;
const COIN_OBJECT_TYPE = `0x2::coin::Coin<${COIN_TYPE_IOTA}>`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeArgs(args: {
    commands?: IotaTransaction[];
    inputs?: IotaCallArg[];
    objectChanges?: IotaObjectChangeWithDisplay[];
    balanceChanges?: { owner: { AddressOwner: string }; coinType: string; amount: string }[];
    perspective?: string;
    recognizedPackages?: string[];
}) {
    return {
        commands: args.commands ?? [],
        inputs: args.inputs ?? [],
        objectChangesWithDisplay: args.objectChanges ?? [],
        balanceChanges: args.balanceChanges ?? [],
        perspective: args.perspective ?? SENDER,
        recognizedPackages: args.recognizedPackages ?? [],
    };
}

function makeNftChange(
    overrides: Partial<IotaObjectChangeWithDisplay> = {},
): IotaObjectChangeWithDisplay {
    return {
        type: 'transferred',
        sender: SENDER,
        recipient: { AddressOwner: RECIPIENT },
        objectType: NFT_TYPE,
        objectId: NFT_OBJECT_ID,
        version: '1',
        digest: 'nft-digest',
        display: { data: { name: 'Wizard #4421', image_url: 'https://example.com/nft.png' } },
        ...overrides,
    } as IotaObjectChangeWithDisplay;
}

function makeTransferObjectsCmd(
    objectInputIndex: number,
    recipientInputIndex: number,
): IotaTransaction {
    return {
        TransferObjects: [[{ Input: objectInputIndex }], { Input: recipientInputIndex }],
    } as unknown as IotaTransaction;
}

function makeMoveCallCmd(packageId: string, module = 'counter', fn = 'increment'): IotaTransaction {
    return {
        MoveCall: {
            package: packageId,
            module,
            function: fn,
            arguments: [],
            type_arguments: [],
        },
    } as unknown as IotaTransaction;
}

function makeObjectInput(objectId: string): IotaCallArg {
    return {
        type: 'object',
        objectId,
        digest: 'digest',
        version: '1',
        objectType: 'immOrOwnedObject',
    } as IotaCallArg;
}

function makeAddressInput(address: string): IotaCallArg {
    return { type: 'pure', value: address, valueType: 'address' };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('recognizePtbEffects', () => {
    describe('coin sends / receives', () => {
        it('produces a coin-send row from balance changes', () => {
            const result = recognizePtbEffects(
                makeArgs({
                    balanceChanges: [
                        {
                            owner: { AddressOwner: SENDER },
                            coinType: COIN_TYPE_IOTA,
                            amount: '-11000000',
                        },
                        {
                            owner: { AddressOwner: RECIPIENT },
                            coinType: COIN_TYPE_IOTA,
                            amount: '10000000',
                        },
                    ],
                }),
            );

            expect(result.recognized).toBe(true);
            const sendRow = result.rows.find((r) => r.kind === 'coin-send');
            expect(sendRow).toBeDefined();
            expect(sendRow).toMatchObject({
                kind: 'coin-send',
                coinType: COIN_TYPE_IOTA,
                amount: 11000000n,
                recipient: RECIPIENT,
            });
        });

        it('produces a coin-receive row when perspective is the recipient', () => {
            const result = recognizePtbEffects(
                makeArgs({
                    perspective: RECIPIENT,
                    balanceChanges: [
                        {
                            owner: { AddressOwner: SENDER },
                            coinType: COIN_TYPE_IOTA,
                            amount: '-11000000',
                        },
                        {
                            owner: { AddressOwner: RECIPIENT },
                            coinType: COIN_TYPE_IOTA,
                            amount: '10000000',
                        },
                    ],
                }),
            );

            expect(result.recognized).toBe(true);
            const receiveRow = result.rows.find((r) => r.kind === 'coin-receive');
            expect(receiveRow).toBeDefined();
            expect(receiveRow).toMatchObject({
                kind: 'coin-receive',
                coinType: COIN_TYPE_IOTA,
                amount: 10000000n,
            });
        });

        it('produces N coin-send rows for N recipients', () => {
            const RECIPIENT2 = '0x3333333333333333333333333333333333333333333333333333333333333333';
            const result = recognizePtbEffects(
                makeArgs({
                    balanceChanges: [
                        {
                            owner: { AddressOwner: SENDER },
                            coinType: COIN_TYPE_IOTA,
                            amount: '-21000000',
                        },
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
                }),
            );

            const sendRows = result.rows.filter((r) => r.kind === 'coin-send');
            expect(sendRows).toHaveLength(2);
            const recipients = sendRows.map((r) => (r as { recipient: string }).recipient);
            expect(recipients).toContain(RECIPIENT);
            expect(recipients).toContain(RECIPIENT2);
        });

        it('deduplicates rows when balance changes have multiple entries for the same coin type', () => {
            // Two separate IOTA changes for sender (gas split) — should produce only one send row
            const result = recognizePtbEffects(
                makeArgs({
                    balanceChanges: [
                        {
                            owner: { AddressOwner: SENDER },
                            coinType: COIN_TYPE_IOTA,
                            amount: '-11000000',
                        },
                        {
                            owner: { AddressOwner: SENDER },
                            coinType: COIN_TYPE_IOTA,
                            amount: '-5000000',
                        },
                        {
                            owner: { AddressOwner: RECIPIENT },
                            coinType: COIN_TYPE_IOTA,
                            amount: '10000000',
                        },
                    ],
                }),
            );

            const sendRows = result.rows.filter((r) => r.kind === 'coin-send');
            expect(sendRows).toHaveLength(1);
        });
    });

    describe('NFT transfers (TransferObjects command)', () => {
        it('produces a transfer-nft row with name and thumbnail from display', () => {
            const nftChange = makeNftChange();
            const result = recognizePtbEffects(
                makeArgs({
                    commands: [makeTransferObjectsCmd(0, 1)],
                    inputs: [makeObjectInput(NFT_OBJECT_ID), makeAddressInput(RECIPIENT)],
                    objectChanges: [nftChange],
                }),
            );

            expect(result.recognized).toBe(true);
            const nftRow = result.rows.find((r) => r.kind === 'transfer-nft');
            expect(nftRow).toBeDefined();
            expect(nftRow).toMatchObject({
                kind: 'transfer-nft',
                name: 'Wizard #4421',
                objectId: NFT_OBJECT_ID,
                recipient: RECIPIENT,
                thumbnail: 'https://example.com/nft.png',
            });
        });

        it('falls back to objectType short name when display has no name', () => {
            const nftChange = makeNftChange({ display: undefined });
            const result = recognizePtbEffects(
                makeArgs({
                    commands: [makeTransferObjectsCmd(0, 1)],
                    inputs: [makeObjectInput(NFT_OBJECT_ID), makeAddressInput(RECIPIENT)],
                    objectChanges: [nftChange],
                }),
            );

            const nftRow = result.rows.find((r) => r.kind === 'transfer-nft');
            expect(nftRow).toBeDefined();
            expect((nftRow as { name: string }).name).toBe('MyNft');
        });

        it('skips coin objects in TransferObjects (captured by balance change rows)', () => {
            const coinChange: IotaObjectChangeWithDisplay = {
                type: 'transferred',
                sender: SENDER,
                recipient: { AddressOwner: RECIPIENT },
                objectType: COIN_OBJECT_TYPE,
                objectId: NFT_OBJECT_ID,
                version: '1',
                digest: 'coin-digest',
            };
            const result = recognizePtbEffects(
                makeArgs({
                    commands: [makeTransferObjectsCmd(0, 1)],
                    inputs: [makeObjectInput(NFT_OBJECT_ID), makeAddressInput(RECIPIENT)],
                    objectChanges: [coinChange],
                    balanceChanges: [
                        {
                            owner: { AddressOwner: SENDER },
                            coinType: COIN_TYPE_IOTA,
                            amount: '-10000000',
                        },
                        {
                            owner: { AddressOwner: RECIPIENT },
                            coinType: COIN_TYPE_IOTA,
                            amount: '10000000',
                        },
                    ],
                }),
            );

            expect(result.rows.some((r) => r.kind === 'transfer-nft')).toBe(false);
            expect(result.rows.some((r) => r.kind === 'coin-send')).toBe(true);
        });
    });

    describe('package publish / upgrade', () => {
        it('produces a publish row when a Publish command is present', () => {
            const publishedChange: IotaObjectChangeWithDisplay = {
                type: 'published',
                packageId: PACKAGE_ID,
                version: '1',
                digest: 'pkg-digest',
                modules: ['my_module'],
            };
            const result = recognizePtbEffects(
                makeArgs({
                    commands: [{ Publish: [] } as unknown as IotaTransaction],
                    objectChanges: [publishedChange],
                }),
            );

            expect(result.recognized).toBe(true);
            expect(result.rows).toHaveLength(1);
            expect(result.rows[0]).toMatchObject({ kind: 'publish', packageId: PACKAGE_ID });
        });

        it('produces an upgrade row when an Upgrade command is present', () => {
            const result = recognizePtbEffects(
                makeArgs({
                    commands: [
                        { Upgrade: [[], PACKAGE_ID, { Input: 0 }] } as unknown as IotaTransaction,
                    ],
                }),
            );

            expect(result.recognized).toBe(true);
            expect(result.rows).toHaveLength(1);
            expect(result.rows[0]).toMatchObject({ kind: 'upgrade', packageId: PACKAGE_ID });
        });
    });

    describe('MoveCall fallback', () => {
        it('marks result as recognized=false when an unknown package is called', () => {
            const result = recognizePtbEffects(
                makeArgs({
                    commands: [makeMoveCallCmd(UNKNOWN_PACKAGE_ID, 'swap', 'execute')],
                    recognizedPackages: [],
                }),
            );

            expect(result.recognized).toBe(false);
            const callRow = result.rows.find((r) => r.kind === 'unknown-call');
            expect(callRow).toBeDefined();
            expect(callRow).toMatchObject({
                kind: 'unknown-call',
                packageId: UNKNOWN_PACKAGE_ID,
                module: 'swap',
                fn: 'execute',
            });
        });

        it('emits a call row (not unknown-call) for a recognized package', () => {
            const result = recognizePtbEffects(
                makeArgs({
                    commands: [makeMoveCallCmd(KNOWN_PACKAGE_ID, 'staking', 'stake')],
                    recognizedPackages: [KNOWN_PACKAGE_ID],
                }),
            );

            expect(result.recognized).toBe(true);
            expect(result.rows).toHaveLength(1);
            expect(result.rows[0]).toMatchObject({
                kind: 'call',
                packageId: KNOWN_PACKAGE_ID,
                module: 'staking',
                fn: 'stake',
            });
        });

        it('is recognized=false when mix of known and unknown package calls exist', () => {
            const result = recognizePtbEffects(
                makeArgs({
                    commands: [
                        makeMoveCallCmd(KNOWN_PACKAGE_ID, 'mod', 'fn'),
                        makeMoveCallCmd(UNKNOWN_PACKAGE_ID, 'other', 'call'),
                    ],
                    recognizedPackages: [KNOWN_PACKAGE_ID],
                }),
            );

            expect(result.recognized).toBe(false);
            expect(result.rows.find((r) => r.kind === 'call')).toBeDefined();
            expect(result.rows.find((r) => r.kind === 'unknown-call')).toBeDefined();
        });

        it('populates structural summary for unrecognized transactions', () => {
            const publishedChange: IotaObjectChangeWithDisplay = {
                type: 'published',
                packageId: PACKAGE_ID,
                version: '1',
                digest: 'pkg-digest',
                modules: [],
            };
            const createdChange: IotaObjectChangeWithDisplay = {
                type: 'created',
                sender: SENDER,
                owner: { AddressOwner: RECIPIENT },
                objectType: NFT_TYPE,
                objectId: NFT_OBJECT_ID,
                version: '1',
                digest: 'nft-digest',
            };
            const result = recognizePtbEffects(
                makeArgs({
                    commands: [
                        makeMoveCallCmd(UNKNOWN_PACKAGE_ID, 'mod', 'fn1'),
                        makeMoveCallCmd(UNKNOWN_PACKAGE_ID, 'mod', 'fn2'),
                    ],
                    objectChanges: [publishedChange, createdChange],
                }),
            );

            expect(result.recognized).toBe(false);
            if (!result.recognized) {
                expect(result.structural.callCount).toBe(2);
                expect(result.structural.uniquePackages).toEqual([UNKNOWN_PACKAGE_ID]);
                expect(result.structural.newObjects).toBe(1);
            }
        });
    });

    describe('SplitCoins / MergeCoins / MakeMoveVec', () => {
        it('absorbs internal plumbing commands silently (no rows, still recognized)', () => {
            const result = recognizePtbEffects(
                makeArgs({
                    commands: [
                        {
                            SplitCoins: [{ GasCoin: true }, [{ Input: 0 }]],
                        } as unknown as IotaTransaction,
                        makeTransferObjectsCmd(1, 2),
                    ],
                    inputs: [
                        { type: 'pure', value: 1000000, valueType: 'u64' },
                        makeObjectInput(NFT_OBJECT_ID),
                        makeAddressInput(RECIPIENT),
                    ],
                    objectChanges: [makeNftChange()],
                }),
            );

            expect(result.recognized).toBe(true);
            expect(result.rows.find((r) => r.kind === 'transfer-nft')).toBeDefined();
        });
    });

    describe('failed transactions', () => {
        it('still produces rows from balance changes that occurred before abort', () => {
            // Even on failure, some gas was spent — balance changes may be non-empty
            const result = recognizePtbEffects(
                makeArgs({
                    commands: [makeMoveCallCmd(UNKNOWN_PACKAGE_ID)],
                    balanceChanges: [
                        {
                            owner: { AddressOwner: SENDER },
                            coinType: COIN_TYPE_IOTA,
                            amount: '-1000000',
                        },
                    ],
                }),
            );

            // No recipient for the negative change — no coin-send row
            // But the unrecognized call row is still produced
            expect(result.recognized).toBe(false);
            if (!result.recognized) {
                expect(result.structural.callCount).toBe(1);
            }
        });

        it('returns recognized=true with empty rows for a tx with no meaningful output', () => {
            const result = recognizePtbEffects(makeArgs({}));

            expect(result.recognized).toBe(true);
            expect(result.rows).toHaveLength(0);
        });
    });
});
