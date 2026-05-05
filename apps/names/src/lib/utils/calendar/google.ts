// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { MS_PER_DAY } from './constants';
import type { CalendarEvent } from './types';
import { dateStr } from './dateUtils';

/**
 * Returns a Google Calendar "Add Event" URL for an all-day event.
 * Note: Google Calendar does not support reminders via URL — alerts are ignored.
 */
export function google(event: CalendarEvent): string {
    const start = dateStr(event.date);
    const end = dateStr(new Date(event.date.getTime() + MS_PER_DAY));

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${start}/${end}`,
        details: event.description,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
