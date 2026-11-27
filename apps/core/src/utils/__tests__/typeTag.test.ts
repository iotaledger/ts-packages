// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { formatTypeTag, getCoinSymbol } from '../typeTag';

const PLAIN = '0xa1::module::Name';
const GENERIC = '0xa1::module::Name<0xb2::module::First, 0xc3::module::Second>';
const NESTED = '0xa1::module::Name<0xb2::module::Inner<0xc3::module::Leaf>>';

describe('formatTypeTag', () => {
    it('drops the package of a plain type', () => {
        expect(formatTypeTag(PLAIN)).toBe('Name');
    });

    it('drops the package of every type argument', () => {
        expect(formatTypeTag(GENERIC)).toBe('Name<First, Second>');
    });

    it('formats nested type arguments', () => {
        expect(formatTypeTag(NESTED)).toBe('Name<Inner<Leaf>>');
    });

    it('leaves primitives and unparsable types as they are', () => {
        expect(formatTypeTag('u64')).toBe('u64');
    });
});

describe('getCoinSymbol', () => {
    it('is the struct name of a plain coin type', () => {
        expect(getCoinSymbol(PLAIN)).toBe('Name');
    });

    it('is the struct name alone for a generic coin type', () => {
        expect(getCoinSymbol(GENERIC)).toBe('Name');
    });

    it('does not cut at the last separator, which lands inside a type argument', () => {
        expect(getCoinSymbol(GENERIC)).not.toBe('Second>');
    });

    it('recognizes IOTA in either spelling, which sorting relies on', () => {
        expect(getCoinSymbol('0x2::iota::IOTA')).toBe('IOTA');
        expect(
            getCoinSymbol(
                '0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA',
            ),
        ).toBe('IOTA');
    });
});
