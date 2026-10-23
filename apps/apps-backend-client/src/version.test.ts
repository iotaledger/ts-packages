// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { isVersionAtLeast } from './version';

describe('isVersionAtLeast', () => {
    it.each([
        ['1.2.3', '1.2.3'],
        ['1.2.4', '1.2.3'],
        ['1.3.0', '1.2.9'],
        ['2.0.0', '1.9.9'],
        ['1.2.3.4', '1.2.3.4'],
        ['1.2.3.5', '1.2.3.4'],
        ['1.2.3', '1.2.3.4'],
        ['1.2.4.1', '1.2.3.4'],
        ['1.10.0', '1.9.0'],
    ])('should accept %s for minVersion %s', (version, minVersion) => {
        expect(isVersionAtLeast(version, minVersion)).toBe(true);
    });

    it.each([
        ['1.2.2', '1.2.3'],
        ['1.1.9', '1.2.0'],
        ['0.9.9', '1.0.0'],
        ['1.2.3.3', '1.2.3.4'],
        ['1.2.2', '1.2.3.4'],
        ['1.9.0', '1.10.0'],
        ['1.2.3.4', '1.2.3'],
    ])('should reject %s for minVersion %s', (version, minVersion) => {
        expect(isVersionAtLeast(version, minVersion)).toBe(false);
    });

    it.each([
        ['', '1.2.3'],
        ['1.2', '1.2.3'],
        ['v1.2.3', '1.2.3'],
        ['1.2.3-rc.1', '1.2.3'],
        ['1.2.3', 'latest'],
        ['1.2.3.4.5', '1.2.3'],
    ])('should reject unparsable version %j against %j', (version, minVersion) => {
        expect(isVersionAtLeast(version, minVersion)).toBe(false);
    });
});
