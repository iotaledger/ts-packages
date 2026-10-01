// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fromHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { VersionedEvent } from '../../../src/bcs/event.js';
import { kebabToCamel, readAbnfRule } from '../../abnf.js';

/**
 * Field names and order come from a decoded value, since `@iota/bcs` keeps a
 * struct's fields private and object keys follow declaration order.
 */
const eventsFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/events.json'), 'utf8'),
);
const event = VersionedEvent.parse(fromHex(eventsFixture.events[0].bcs)).V1!;

function fieldNames(rule: string): (string | undefined)[] {
    return readAbnfRule(rule).map(({ name }) => name && kebabToCamel(name));
}

describe('BCS schemas match bcs-schema.abnf', () => {
    it('event', () => {
        expect(Object.keys(event)).toEqual(fieldNames('event'));
    });

    it('transaction-events is a vector of unversioned events', () => {
        expect(readAbnfRule('transaction-events')).toEqual([
            { body: '(size *event)', name: undefined },
        ]);
    });

    it('struct-tag, reused from @iota/iota-sdk', () => {
        expect(Object.keys(event.structTag)).toEqual(fieldNames('struct-tag'));
    });
});
