// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { toBase64 } from '@iota/bcs';
import type { BcsType } from '@iota/bcs';
import { bcs } from '@iota/iota-sdk/bcs';

import type { MoveTypeLayout } from './move.js';
import { toShortTypeString } from './util.js';

export function layoutToBcs(layout: MoveTypeLayout): BcsType<any> {
    switch (layout) {
        case 'address':
            return bcs.Address;
        case 'bool':
            return bcs.Bool;
        case 'u8':
            return bcs.U8;
        case 'u16':
            return bcs.U16;
        case 'u32':
            return bcs.U32;
        case 'u64':
            return bcs.U64;
        case 'u128':
            return bcs.U128;
        case 'u256':
            return bcs.U256;
    }

    if ('vector' in layout) {
        return bcs.vector(layoutToBcs(layout.vector));
    }

    if ('struct' in layout) {
        const fields: Record<string, BcsType<any>> = {};

        for (const { name, layout: field } of layout.struct.fields) {
            fields[name] = layoutToBcs(field);
        }

        let struct: BcsType<any> = bcs.struct(layout.struct.type, fields);
        const structName = toShortTypeString(layout.struct.type);

        if (structName === '0x2::object::ID') {
            struct = struct.transform({
                input: (id) => (typeof id === 'string' ? { bytes: id } : id) as never,
                output: (id) => id.bytes,
            });
        }

        if (structName === '0x1::string::String') {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            struct = struct.transform({
                input: (str) =>
                    typeof str === 'string' ? { bytes: Array.from(encoder.encode(str)) } : str,
                output: (obj) => decoder.decode(Uint8Array.from(obj.bytes)),
            });
        }

        return struct;
    }

    throw new Error(`Unknown layout: ${JSON.stringify(layout)}`);
}

export function mapJsonToBcs(json: unknown, layout: MoveTypeLayout) {
    const schema = layoutToBcs(layout);
    return toBase64(schema.serialize(json).toBytes());
}
