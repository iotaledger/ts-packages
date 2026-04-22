// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { MoveStruct, MoveValue } from '@iota/iota-sdk/client';
import { toBase64 } from '@iota/iota-sdk/utils';

/** Convert a MoveValue byte array to a base64 string. */
export function bytesToBase64(value: MoveValue | undefined): string {
    if (Array.isArray(value)) {
        return toBase64(new Uint8Array(value as number[]));
    }
    return typeof value === 'string' ? value : '';
}

export interface MoveStructFields {
    fields: { [key: string]: MoveValue };
}

export function isMoveStructWithFields(
    data: MoveStruct,
): data is { fields: { [key: string]: MoveValue }; type: string } {
    return (
        typeof data === 'object' &&
        data !== null &&
        'fields' in data &&
        typeof data.fields === 'object' &&
        data.fields !== null
    );
}

export function getMoveFields(object: MoveStruct): { [key: string]: MoveValue } {
    if (isMoveStructWithFields(object)) {
        return object.fields as { [key: string]: MoveValue };
    }
    return {};
}
