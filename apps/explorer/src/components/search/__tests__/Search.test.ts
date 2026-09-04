// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { trimAuditTrailNotalizationSuffix } from '../utils';

describe('trimAuditTrailNotalizationSuffix', () => {
    it.each([
        ['0x123-audittrail', '0x123'],
        ['0x123-notarization', '0x123'],
        ['0x123', '0x123'],
        ['some-ordinary-id', 'some-ordinary-id'],
        [
            'did-iota-testnet-0xdc704ab63984d5763576c12ce5f62fe735766bc1fc9892a5e2a7be777a9af897',
            'did-iota-testnet-0xdc704ab63984d5763576c12ce5f62fe735766bc1fc9892a5e2a7be777a9af897',
        ],
    ])('normalizes %s to %s', (possibleDashedId, expected) => {
        expect(trimAuditTrailNotalizationSuffix(possibleDashedId)).toBe(expected);
    });
});
