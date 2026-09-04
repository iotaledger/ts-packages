// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import {
    type IotaArgument,
    type IotaTransaction,
    type MoveCallIotaTransaction,
} from '@iota/iota-sdk/client';
import { isValidIotaAddress, toHex } from '@iota/iota-sdk/utils';
import { EVM_ADDRESS_LENGTH } from '~/lib/constants/evm.constants';

/** Extracts the `IotaArgument`s referenced by a single PTB command, regardless of its shape. */
export function getCommandArguments(type: string, data: unknown): IotaArgument[] {
    switch (type) {
        case 'MoveCall':
            return (data as MoveCallIotaTransaction).arguments ?? [];
        case 'TransferObjects': {
            const [objects, recipient] = data as [IotaArgument[], IotaArgument];
            return [...objects, recipient];
        }
        case 'SplitCoins': {
            const [coin, amounts] = data as [IotaArgument, IotaArgument[]];
            return [coin, ...amounts];
        }
        case 'MergeCoins': {
            const [destinationCoin, coins] = data as [IotaArgument, IotaArgument[]];
            return [destinationCoin, ...coins];
        }
        case 'MakeMoveVec': {
            const [, elements] = data as [string | null, IotaArgument[]];
            return elements;
        }
        case 'Upgrade': {
            const [, , ticket] = data as [string[], string, IotaArgument];
            return [ticket];
        }
        case 'Publish':
        default:
            return [];
    }
}

export function flattenIotaArguments(data: (IotaArgument | IotaArgument[])[]): string {
    if (!data) {
        return '';
    }

    return data
        .map((value) => {
            if (value === 'GasCoin') {
                return value;
            } else if (Array.isArray(value)) {
                return `[${flattenIotaArguments(value)}]`;
            } else if (value === null) {
                return 'Null';
            } else if (typeof value === 'object') {
                if ('Input' in value) {
                    return `Input(${value.Input})`;
                } else if ('Result' in value) {
                    return `Result(${value.Result})`;
                } else if ('NestedResult' in value) {
                    return `NestedResult(${value.NestedResult[0]}, ${value.NestedResult[1]})`;
                }
            } else if (typeof value === 'string') {
                return value;
            } else {
                throw new Error('Not a correct flattenable data');
            }
        })
        .join(', ');
}

export function decodeVectorU8Value(value: unknown): string {
    const stringValue = String(value);

    let parsedVector: Array<number> | null = null;
    try {
        parsedVector = JSON.parse(`[${stringValue}]`);
    } catch (_) {
        // Silent error
    }

    let parsedUtf: string | null = null;
    try {
        parsedUtf = new TextDecoder('utf-8', {
            fatal: true,
        }).decode(new Uint8Array(parsedVector ?? []));
    } catch (_) {
        // Silent error
    }

    let parsedAddress: string | null = null;
    try {
        if (parsedVector) {
            const hex = toHex(new Uint8Array(parsedVector));
            if (hex.length == EVM_ADDRESS_LENGTH || isValidIotaAddress(hex)) {
                parsedAddress = hex;
            }
        }
    } catch (_) {
        // Silent error
    }

    if (parsedUtf) {
        return parsedUtf;
    } else if (parsedAddress) {
        return parsedAddress;
    }

    return stringValue;
}

export interface ResultConsumer {
    commandIndex: number;
    type: string;
    nestedIndex?: number;
}

export function getResultUsedByCommands(
    commandIndex: number,
    transactions: IotaTransaction[],
): ResultConsumer[] {
    return transactions.reduce<ResultConsumer[]>((usedBy, transaction, otherCommandIndex) => {
        const [[type, data]] = Object.entries(transaction);
        const args = getCommandArguments(type, data);

        args.forEach((arg) => {
            if (typeof arg !== 'object' || arg === null) {
                return;
            }

            if ('Result' in arg && arg.Result === commandIndex) {
                usedBy.push({ commandIndex: otherCommandIndex, type });
            } else if ('NestedResult' in arg && arg.NestedResult[0] === commandIndex) {
                usedBy.push({
                    commandIndex: otherCommandIndex,
                    type,
                    nestedIndex: arg.NestedResult[1],
                });
            }
        });

        return usedBy;
    }, []);
}
