// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import { pureBcsSchemaFromTypeName, type PureTypeName } from '@iota/iota-sdk/bcs';
import {
    type IotaArgument,
    type IotaTransaction,
    type MoveCallIotaTransaction,
} from '@iota/iota-sdk/client';
import { isValidIotaAddress, toHex } from '@iota/iota-sdk/utils';
import { EVM_ADDRESS_LENGTH } from '~/lib/constants/evm.constants';

export const REGEX_NUMBER = /^\d+$/;

export function truncateMiddle(value: string, max = 40): string {
    if (value.length <= max) {
        return value;
    }

    const head = Math.ceil((max - 1) / 2);
    const tail = Math.floor((max - 1) / 2);
    return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function truncateEnd(value: string, max = 40): string {
    if (value.length <= max) {
        return value;
    }

    return `${value.slice(0, max - 1)}…`;
}

function toBcsPureType(valueType: string): string {
    return valueType
        .replace(/0x0*1::(string|ascii)::String/g, 'string')
        .replace(/0x0*2::object::ID/g, 'id')
        .replace(/0x0*1::option::Option</g, 'option<');
}

export function pureValueHex(valueType: string, value: unknown): string | null {
    try {
        const schema = pureBcsSchemaFromTypeName(toBcsPureType(valueType) as PureTypeName);
        return toHex(schema.serialize(value as never).toBytes());
    } catch {
        return null;
    }
}

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

export interface DecodedVectorU8Value {
    value: string;
    kind: 'text' | 'address' | 'raw';
}

export function decodeVectorU8Value(value: unknown): DecodedVectorU8Value {
    const stringValue = String(value);

    let parsedVector: Array<number> | null = null;
    try {
        parsedVector = JSON.parse(`[${stringValue}]`);
    } catch (_) {
        parsedVector = null;
    }

    let parsedUtf: string | null = null;
    try {
        const decoded = new TextDecoder('utf-8', {
            fatal: true,
        }).decode(new Uint8Array(parsedVector ?? []));
        // eslint-disable-next-line no-control-regex
        const hasControlCharacters = /[\x00-\x08\x0e-\x1f\x7f]/.test(decoded);
        parsedUtf = decoded.length > 0 && !hasControlCharacters ? decoded : null;
    } catch (_) {
        parsedUtf = null;
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
        parsedAddress = null;
    }

    if (parsedUtf) {
        return { value: parsedUtf, kind: 'text' };
    } else if (parsedAddress) {
        return { value: parsedAddress, kind: 'address' };
    }

    return { value: stringValue, kind: 'raw' };
}

export function getResultUsedByCommands(
    commandIndex: number,
    transactions: IotaTransaction[],
): number[] {
    return transactions.flatMap((transaction, otherCommandIndex) => {
        const [[type, data]] = Object.entries(transaction);
        const isConsumer = getCommandArguments(type, data).some(
            (arg) =>
                typeof arg === 'object' &&
                (('Result' in arg && arg.Result === commandIndex) ||
                    ('NestedResult' in arg && arg.NestedResult[0] === commandIndex)),
        );
        return isConsumer ? [otherCommandIndex] : [];
    });
}
