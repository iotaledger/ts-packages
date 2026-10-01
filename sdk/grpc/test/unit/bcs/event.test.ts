// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fromHex, toBase58, toHex } from '@iota/bcs';
import { TypeTagSerializer } from '@iota/iota-sdk/bcs';
import { blake2b } from '@noble/hashes/blake2';
import { describe, expect, it } from 'vitest';

import { TransactionEvents, VersionedEvent } from '../../../src/bcs/event.js';

/**
 * Every field the server sends for one mainnet transaction's events, captured
 * with the full `transactions.events` mask. The separate fields are the
 * server's own reading of the same bytes, so they check the decoder.
 */
interface EventsFixture {
    source: { network: string; checkpoint: string; transaction: string; capturedAt: string };
    eventsDigest: string;
    events: {
        bcs: string;
        packageId: string;
        module: string;
        sender: string;
        eventType: string;
        bcsContents: string;
    }[];
}

const fixture: EventsFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/events.json'), 'utf8'),
);

function transactionEventsDigest(bcs: Uint8Array): string {
    const salt = new TextEncoder().encode('TransactionEvents::');
    return toBase58(blake2b(new Uint8Array([...salt, ...bcs]), { dkLen: 32 }));
}

describe('VersionedEvent', () => {
    describe.each(fixture.events.map((event, index) => [index, event] as const))(
        'mainnet event %i',
        (_, expected) => {
            const bytes = fromHex(expected.bcs);
            const decoded = VersionedEvent.parse(bytes);

            it('is the V1 variant', () => {
                expect(decoded.$kind).toBe('V1');
            });

            it('agrees with the fields the server sent alongside', () => {
                const event = decoded.V1!;

                expect(event.packageId).toBe(expected.packageId);
                expect(event.module).toBe(expected.module);
                expect(event.sender).toBe(expected.sender);
                expect(TypeTagSerializer.tagToString({ struct: event.structTag })).toBe(
                    expected.eventType,
                );
                expect(toHex(event.contents)).toBe(expected.bcsContents);
            });

            it('re-encodes to the same bytes', () => {
                expect(toHex(VersionedEvent.serialize(decoded).toBytes())).toBe(expected.bcs);
            });
        },
    );

    it('rejects a version it does not know', () => {
        const bytes = fromHex(fixture.events[0].bcs);
        bytes[0] = 0x01;

        expect(() => VersionedEvent.parse(bytes)).toThrow();
    });

    it('rejects truncated bytes', () => {
        const bytes = fromHex(fixture.events[0].bcs);

        expect(() => VersionedEvent.parse(bytes.slice(0, -1))).toThrow();
    });
});

describe('TransactionEvents', () => {
    const events = fixture.events.map((event) => VersionedEvent.parse(fromHex(event.bcs)).V1!);

    it('hashes to the events digest the server sent', () => {
        const bcs = TransactionEvents.serialize(events).toBytes();

        expect(transactionEventsDigest(bcs)).toBe(fixture.eventsDigest);
    });

    it('round-trips', () => {
        const bcs = TransactionEvents.serialize(events).toBytes();

        expect(TransactionEvents.parse(bcs)).toEqual(events);
    });
});
