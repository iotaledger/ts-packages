// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import { type IotaArgument, type MoveCallIotaTransaction } from '@iota/iota-sdk/client';

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
