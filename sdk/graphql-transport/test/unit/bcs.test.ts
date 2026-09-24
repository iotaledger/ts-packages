// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@iota/bcs';
import {
    MOVE_STDLIB_ADDRESS,
    IOTA_FRAMEWORK_ADDRESS,
    IOTA_CLOCK_OBJECT_ID,
    normalizeIotaAddress,
} from '@iota/iota-sdk/utils';
import { describe, expect, test } from 'vitest';

import { layoutToBcs, mapJsonToBcs } from '../../src/mappers/bcs.js';
import type { MoveTypeLayout } from '../../src/mappers/move.js';

const STRING_LAYOUT: MoveTypeLayout = {
    struct: {
        type: `${normalizeIotaAddress(MOVE_STDLIB_ADDRESS)}::string::String`,
        fields: [{ name: 'bytes', layout: { vector: 'u8' } }],
    },
};

const ID_LAYOUT: MoveTypeLayout = {
    struct: {
        type: `${normalizeIotaAddress(IOTA_FRAMEWORK_ADDRESS)}::object::ID`,
        fields: [{ name: 'bytes', layout: 'address' }],
    },
};

function roundTrip(value: unknown, layout: MoveTypeLayout) {
    return layoutToBcs(layout as MoveTypeLayout).parse(fromBase64(mapJsonToBcs(value, layout)));
}

describe('layoutToBcs', () => {
    test('serializes primitives (u64)', () => {
        expect(roundTrip('5', 'u64')).toBe('5');
    });

    test('serializes 0x1::string::String from a plain string', () => {
        expect(mapJsonToBcs('field_name', STRING_LAYOUT)).toBe('CmZpZWxkX25hbWU=');
        expect(roundTrip('field_name', STRING_LAYOUT)).toBe('field_name');
    });

    test('serializes 0x2::object::ID from an address string', () => {
        expect(roundTrip(IOTA_CLOCK_OBJECT_ID, ID_LAYOUT)).toBe(IOTA_CLOCK_OBJECT_ID);
    });
});
