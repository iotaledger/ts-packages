// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
    decodeVectorU8Value,
    flattenIotaArguments,
    getCommandArguments,
    getResultUsedByCommands,
} from '~/pages/transaction-result/programmable-transaction-view/utils';
import { type IotaTransaction } from '@iota/iota-sdk/client';

describe('utils.ts', () => {
    describe('flattenCommandData', () => {
        it('should format SplitCoin data', () => {
            expect(flattenIotaArguments(['GasCoin', { Input: 1 }])).toEqual('GasCoin, Input(1)');
            expect(flattenIotaArguments(['GasCoin', { Result: 2 }])).toEqual('GasCoin, Result(2)');
            expect(flattenIotaArguments(['GasCoin', { NestedResult: [1, 2] }])).toEqual(
                'GasCoin, NestedResult(1, 2)',
            );
        });
        it('should format TransferObjects data', () => {
            expect(
                flattenIotaArguments([
                    [
                        {
                            Result: 0,
                        },
                        {
                            Result: 1,
                        },
                        {
                            Result: 2,
                        },
                        {
                            Result: 3,
                        },
                        {
                            Result: 4,
                        },
                    ],
                    {
                        Input: 0,
                    },
                ]),
            ).toEqual('[Result(0), Result(1), Result(2), Result(3), Result(4)], Input(0)');
        });
        it('should flatten MergeCoinsIotaTransaction data', () => {
            expect(
                flattenIotaArguments([
                    {
                        Input: 0,
                    },
                    [
                        {
                            Result: 0,
                        },
                        {
                            Result: 1,
                        },
                        {
                            Result: 2,
                        },
                        {
                            Result: 3,
                        },
                        {
                            Result: 4,
                        },
                    ],
                ]),
            ).toEqual('Input(0), [Result(0), Result(1), Result(2), Result(3), Result(4)]');
        });
    });

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
            expect(decodeVectorU8Value(bytes.join(','))).toEqual('hello');
        });

        it('decodes address-shaped bytes as hex', () => {
            const bytes = new Array(32).fill(0x80);
            expect(decodeVectorU8Value(bytes.join(','))).toEqual(
                '8080808080808080808080808080808080808080808080808080808080808080',
            );
        });

        it('falls back to the raw stringified array when neither decoding succeeds', () => {
            const bytes = [255, 254, 253];
            expect(decodeVectorU8Value(bytes.join(','))).toEqual(bytes.join(','));
        });
    });

    describe('getResultUsedByCommands', () => {
        it('returns the command that consumes a Result', () => {
            const transactions = [
                { SplitCoins: [{ Input: 0 }, [{ Input: 1 }]] },
                { TransferObjects: [[{ Result: 0 }], { Input: 2 }] },
            ] as unknown as IotaTransaction[];

            expect(getResultUsedByCommands(0, transactions)).toEqual([
                { commandIndex: 1, type: 'TransferObjects' },
            ]);
        });

        it('returns the command that consumes a NestedResult', () => {
            const transactions = [
                { SplitCoins: [{ Input: 0 }, [{ Input: 1 }, { Input: 2 }]] },
                { TransferObjects: [[{ NestedResult: [0, 1] }], { Input: 3 }] },
            ] as unknown as IotaTransaction[];

            expect(getResultUsedByCommands(0, transactions)).toEqual([
                { commandIndex: 1, type: 'TransferObjects', nestedIndex: 1 },
            ]);
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
