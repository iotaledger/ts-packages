// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { google } from './google';
import type { CalendarEvent } from './types';

const BASE_EVENT: CalendarEvent = {
    title: 'My birthday party',
    description: 'Be there!',
    date: new Date(2025, 0, 15), // Jan 15, 2025 local time
};

function parseUrl(event: CalendarEvent) {
    const url = new URL(google(event));
    return { url, params: new URLSearchParams(url.search) };
}

describe('google', () => {
    describe('URL structure', () => {
        it('returns a Google Calendar render URL', () => {
            const { url } = parseUrl(BASE_EVENT);
            expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
        });

        it('sets action=TEMPLATE', () => {
            const { params } = parseUrl(BASE_EVENT);
            expect(params.get('action')).toBe('TEMPLATE');
        });
    });

    describe('event fields', () => {
        it('maps title to text param', () => {
            const { params } = parseUrl(BASE_EVENT);
            expect(params.get('text')).toBe('My birthday party');
        });

        it('maps description to details param', () => {
            const { params } = parseUrl(BASE_EVENT);
            expect(params.get('details')).toBe('Be there!');
        });

        it('formats dates as YYYYMMDD/YYYYMMDD with end date +1 day', () => {
            const { params } = parseUrl(BASE_EVENT);
            expect(params.get('dates')).toBe('20250115/20250116');
        });
    });

    describe('date boundaries', () => {
        it('rolls over at month end', () => {
            const { params } = parseUrl({ ...BASE_EVENT, date: new Date(2025, 0, 31) });
            expect(params.get('dates')).toBe('20250131/20250201');
        });

        it('rolls over at year end', () => {
            const { params } = parseUrl({ ...BASE_EVENT, date: new Date(2025, 11, 31) });
            expect(params.get('dates')).toBe('20251231/20260101');
        });

        it('handles leap day', () => {
            const { params } = parseUrl({ ...BASE_EVENT, date: new Date(2024, 1, 29) });
            expect(params.get('dates')).toBe('20240229/20240301');
        });

        it('pads single-digit months and days', () => {
            const { params } = parseUrl({ ...BASE_EVENT, date: new Date(2025, 0, 5) });
            expect(params.get('dates')).toBe('20250105/20250106');
        });
    });

    describe('alerts', () => {
        it('produces a valid URL even when alerts are provided', () => {
            const event: CalendarEvent = {
                ...BASE_EVENT,
                alerts: [
                    { triggerAt: new Date('2024-12-15T09:00:00Z'), description: '1 month' },
                    { triggerAt: new Date('2025-01-14T09:00:00Z'), description: '1 day' },
                ],
            };
            const { url } = parseUrl(event);
            expect(url.href).toContain('calendar.google.com');
        });

        it('does not include alert information in the URL', () => {
            const event: CalendarEvent = {
                ...BASE_EVENT,
                alerts: [{ triggerAt: new Date('2025-01-14T09:00:00Z'), description: 'reminder' }],
            };
            const { params } = parseUrl(event);
            expect(params.get('reminder')).toBeNull();
            expect(params.get('alerts')).toBeNull();
        });
    });

    describe('special characters', () => {
        it('handles ampersands in title', () => {
            const { params } = parseUrl({ ...BASE_EVENT, title: 'Cats & Dogs' });
            expect(params.get('text')).toBe('Cats & Dogs');
        });

        it('handles unicode in description', () => {
            const { params } = parseUrl({
                ...BASE_EVENT,
                description: 'Renew at iotanames.com 🎉',
            });
            expect(params.get('details')).toBe('Renew at iotanames.com 🎉');
        });
    });
});
