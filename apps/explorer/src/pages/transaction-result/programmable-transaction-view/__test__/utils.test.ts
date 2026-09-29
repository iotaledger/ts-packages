// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
    decodeVectorU8Value,
    getCommandArguments,
    getResultUsedByCommands,
    pureValueHex,
} from '~/pages/transaction-result/programmable-transaction-view/utils';
import { type IotaTransaction } from '@iota/iota-sdk/client';

describe('utils.ts', () => {
    describe('getCommandArguments', () => {
        it('extracts arguments from MoveCall', () => {
            expect(
                getCommandArguments('MoveCall', {
                    package: '0x2',
                    module: 'coin',
                    function: 'split',
                    arguments: [{ Input: 0 }, { Result: 1 }],
                }),
            ).toEqual([{ Input: 0 }, { Result: 1 }]);
        });

        it('extracts arguments from TransferObjects', () => {
            expect(
                getCommandArguments('TransferObjects', [
                    [{ Input: 0 }, { Result: 1 }],
                    { Input: 2 },
                ]),
            ).toEqual([{ Input: 0 }, { Result: 1 }, { Input: 2 }]);
        });

        it('extracts arguments from SplitCoins', () => {
            expect(
                getCommandArguments('SplitCoins', [{ Input: 0 }, [{ Input: 1 }, { Input: 2 }]]),
            ).toEqual([{ Input: 0 }, { Input: 1 }, { Input: 2 }]);
        });

        it('extracts arguments from MergeCoins', () => {
            expect(
                getCommandArguments('MergeCoins', [{ Input: 0 }, [{ Input: 1 }, { Input: 2 }]]),
            ).toEqual([{ Input: 0 }, { Input: 1 }, { Input: 2 }]);
        });

        it('extracts arguments from MakeMoveVec', () => {
            expect(getCommandArguments('MakeMoveVec', [null, [{ Input: 0 }]])).toEqual([
                { Input: 0 },
            ]);
        });

        it('extracts the ticket argument from Upgrade', () => {
            expect(getCommandArguments('Upgrade', [['0x1'], '0x2', { Input: 0 }])).toEqual([
                { Input: 0 },
            ]);
        });

        it('returns an empty array for Publish', () => {
            expect(getCommandArguments('Publish', ['deadbeef'])).toEqual([]);
        });
    });

    describe('decodeVectorU8Value', () => {
        it('decodes UTF-8 text bytes', () => {
            const bytes = Array.from(new TextEncoder().encode('hello'));
            expect(decodeVectorU8Value(bytes.join(','))).toEqual({ value: 'hello', kind: 'text' });
        });

        it('decodes address-shaped bytes as hex', () => {
            const bytes = new Array(32).fill(0x80);
            expect(decodeVectorU8Value(bytes.join(','))).toEqual({
                value: '8080808080808080808080808080808080808080808080808080808080808080',
                kind: 'address',
            });
        });

        it('falls back to the raw stringified array when neither decoding succeeds', () => {
            const bytes = [255, 254, 253];
            expect(decodeVectorU8Value(bytes.join(','))).toEqual({
                value: bytes.join(','),
                kind: 'raw',
            });
        });
    });

    describe('pureValueHex', () => {
        const STD = '0x0000000000000000000000000000000000000000000000000000000000000001';

        it('serializes primitive pure values to BCS hex', () => {
            expect(pureValueHex('u64', '1000')).toEqual('e803000000000000');
            expect(pureValueHex('vector<u8>', [104, 105])).toEqual('026869');
        });

        it('serializes framework string, ID and Option types, including nested ones', () => {
            expect(pureValueHex(`${STD}::string::String`, 'hi')).toEqual('026869');
            expect(pureValueHex(`${STD}::ascii::String`, 'hi')).toEqual('026869');
            expect(pureValueHex('0x2::object::ID', '0x5')).toEqual(`${'0'.repeat(63)}5`);
            expect(pureValueHex(`${STD}::option::Option<u64>`, '5')).toEqual('010500000000000000');
            expect(pureValueHex(`vector<${STD}::string::String>`, ['a'])).toEqual('010161');
        });

        it('returns null for types that are not pure', () => {
            expect(pureValueHex('0x2::coin::Coin<0x2::iota::IOTA>', {})).toBeNull();
        });
    });

    describe('getResultUsedByCommands', () => {
        it('lists a consumer once even when it uses several outputs of the command', () => {
            const transactions = [
                { SplitCoins: [{ Input: 0 }, [{ Input: 1 }, { Input: 2 }]] },
                {
                    TransferObjects: [
                        [{ NestedResult: [0, 0] }, { NestedResult: [0, 1] }],
                        { Input: 3 },
                    ],
                },
            ] as unknown as IotaTransaction[];

            expect(getResultUsedByCommands(0, transactions)).toEqual([1]);
        });

        it('returns the command that consumes a Result', () => {
            const transactions = [
                { SplitCoins: [{ Input: 0 }, [{ Input: 1 }]] },
                { TransferObjects: [[{ Result: 0 }], { Input: 2 }] },
            ] as unknown as IotaTransaction[];

            expect(getResultUsedByCommands(0, transactions)).toEqual([1]);
        });

        it('returns the command that consumes a NestedResult', () => {
            const transactions = [
                { SplitCoins: [{ Input: 0 }, [{ Input: 1 }, { Input: 2 }]] },
                { TransferObjects: [[{ NestedResult: [0, 1] }], { Input: 3 }] },
            ] as unknown as IotaTransaction[];

            expect(getResultUsedByCommands(0, transactions)).toEqual([1]);
        });

        it('returns an empty array when the result is unused', () => {
            const transactions = [
                { SplitCoins: [{ Input: 0 }, [{ Input: 1 }]] },
                { TransferObjects: [[{ Input: 2 }], { Input: 3 }] },
            ] as unknown as IotaTransaction[];

            expect(getResultUsedByCommands(0, transactions)).toEqual([]);
        });
    });
});
