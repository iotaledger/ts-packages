// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { ics } from './ics';
import type { CalendarEvent } from './types';

const BASE_EVENT: CalendarEvent = {
    title: 'My birthday party',
    description: 'Be there!',
    date: new Date(2025, 0, 15), // Jan 15, 2025 local time
};

// A fixed UTC trigger time used in tests that verify the exact TRIGGER output.
// Using an explicit UTC string ensures tests pass in any timezone.
const FIXED_TRIGGER = new Date('2025-01-14T09:00:00Z');
const FIXED_TRIGGER_ICS = 'TRIGGER;VALUE=DATE-TIME:20250114T090000Z';

function lines(content: string): string[] {
    return content.split('\r\n');
}

describe('ics', () => {
    describe('calendar structure', () => {
        it('starts with BEGIN:VCALENDAR', () => {
            expect(lines(ics(BASE_EVENT))[0]).toBe('BEGIN:VCALENDAR');
        });

        it('ends with END:VCALENDAR', () => {
            const l = lines(ics(BASE_EVENT));
            expect(l[l.length - 1]).toBe('END:VCALENDAR');
        });

        it('includes VERSION:2.0', () => {
            expect(ics(BASE_EVENT)).toContain('VERSION:2.0');
        });

        it('includes CALSCALE:GREGORIAN', () => {
            expect(ics(BASE_EVENT)).toContain('CALSCALE:GREGORIAN');
        });

        it('uses CRLF line endings throughout', () => {
            const content = ics(BASE_EVENT);
            const linesLF = content.split('\n').length;
            const linesCRLF = content.split('\r\n').length;
            expect(linesLF).toBe(linesCRLF);
        });
    });

    describe('VEVENT fields', () => {
        it('wraps event in VEVENT block', () => {
            expect(ics(BASE_EVENT)).toContain('BEGIN:VEVENT');
            expect(ics(BASE_EVENT)).toContain('END:VEVENT');
        });

        it('includes a UID ending in @iota-names', () => {
            expect(ics(BASE_EVENT)).toMatch(/UID:.+@iota-names/);
        });

        it('formats DTSTART as all-day date', () => {
            expect(ics(BASE_EVENT)).toContain('DTSTART;VALUE=DATE:20250115');
        });

        it('formats DTEND as the next day', () => {
            expect(ics(BASE_EVENT)).toContain('DTEND;VALUE=DATE:20250116');
        });

        it('includes SUMMARY with the title', () => {
            expect(ics(BASE_EVENT)).toContain('SUMMARY:My birthday party');
        });

        it('includes DESCRIPTION', () => {
            expect(ics(BASE_EVENT)).toContain('DESCRIPTION:Be there!');
        });
    });

    describe('date boundaries', () => {
        it('rolls DTEND over at month end', () => {
            const content = ics({ ...BASE_EVENT, date: new Date(2025, 0, 31) });
            expect(content).toContain('DTSTART;VALUE=DATE:20250131');
            expect(content).toContain('DTEND;VALUE=DATE:20250201');
        });

        it('rolls DTEND over at year end', () => {
            const content = ics({ ...BASE_EVENT, date: new Date(2025, 11, 31) });
            expect(content).toContain('DTSTART;VALUE=DATE:20251231');
            expect(content).toContain('DTEND;VALUE=DATE:20260101');
        });

        it('handles leap day', () => {
            const content = ics({ ...BASE_EVENT, date: new Date(2024, 1, 29) });
            expect(content).toContain('DTSTART;VALUE=DATE:20240229');
            expect(content).toContain('DTEND;VALUE=DATE:20240301');
        });
    });

    describe('VALARM blocks', () => {
        it('generates no VALARM when alerts is undefined', () => {
            expect(ics(BASE_EVENT)).not.toContain('BEGIN:VALARM');
        });

        it('generates no VALARM when alerts is empty', () => {
            expect(ics({ ...BASE_EVENT, alerts: [] })).not.toContain('BEGIN:VALARM');
        });

        it('generates one VALARM per alert', () => {
            const event: CalendarEvent = {
                ...BASE_EVENT,
                alerts: [
                    { triggerAt: new Date('2024-12-15T09:00:00Z'), description: '1 month away' },
                    { triggerAt: new Date('2025-01-14T09:00:00Z'), description: '1 day away' },
                    { triggerAt: new Date('2025-01-15T09:00:00Z'), description: 'today' },
                ],
            };
            const matches = ics(event).match(/BEGIN:VALARM/g);
            expect(matches).toHaveLength(3);
        });

        it('includes VALARM DESCRIPTION', () => {
            const event: CalendarEvent = {
                ...BASE_EVENT,
                alerts: [{ triggerAt: FIXED_TRIGGER, description: 'Almost time!' }],
            };
            expect(ics(event)).toContain('DESCRIPTION:Almost time!');
        });

        it('uses absolute UTC datetime trigger', () => {
            const event: CalendarEvent = {
                ...BASE_EVENT,
                alerts: [{ triggerAt: FIXED_TRIGGER, description: 'reminder' }],
            };
            expect(ics(event)).toContain(FIXED_TRIGGER_ICS);
        });

        it('preserves seconds in trigger time', () => {
            const trigger = new Date('2025-01-14T08:30:45Z');
            const event: CalendarEvent = {
                ...BASE_EVENT,
                alerts: [{ triggerAt: trigger, description: 'reminder' }],
            };
            expect(ics(event)).toContain('TRIGGER;VALUE=DATE-TIME:20250114T083045Z');
        });

        it('formats multiple triggers independently', () => {
            const event: CalendarEvent = {
                ...BASE_EVENT,
                alerts: [
                    { triggerAt: new Date('2024-12-15T09:00:00Z'), description: 'a' },
                    { triggerAt: new Date('2025-01-14T09:00:00Z'), description: 'b' },
                ],
            };
            const content = ics(event);
            expect(content).toContain('TRIGGER;VALUE=DATE-TIME:20241215T090000Z');
            expect(content).toContain('TRIGGER;VALUE=DATE-TIME:20250114T090000Z');
        });
    });

    describe('text escaping', () => {
        it('escapes backslashes in title', () => {
            expect(ics({ ...BASE_EVENT, title: 'a\\b' })).toContain('SUMMARY:a\\\\b');
        });

        it('escapes semicolons in title', () => {
            expect(ics({ ...BASE_EVENT, title: 'a;b' })).toContain('SUMMARY:a\\;b');
        });

        it('escapes commas in title', () => {
            expect(ics({ ...BASE_EVENT, title: 'a,b' })).toContain('SUMMARY:a\\,b');
        });

        it('escapes newlines in description', () => {
            expect(ics({ ...BASE_EVENT, description: 'line1\nline2' })).toContain(
                'DESCRIPTION:line1\\nline2',
            );
        });

        it('escapes special characters in alert descriptions', () => {
            const event: CalendarEvent = {
                ...BASE_EVENT,
                alerts: [{ triggerAt: FIXED_TRIGGER, description: 'Renew name,iota' }],
            };
            expect(ics(event)).toContain('DESCRIPTION:Renew name\\,iota');
        });
    });
});
