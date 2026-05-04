// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { CalendarEvent } from './types';

function dateStr(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * Returns a Google Calendar "Add Event" URL for an all-day event.
 * Note: Google Calendar does not support reminders via URL — alerts are ignored.
 */
export function google(event: CalendarEvent): string {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
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
