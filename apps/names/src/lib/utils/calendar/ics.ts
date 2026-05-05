// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { CalendarAlert, CalendarEvent } from './types';

function escapeText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

function toAllDayDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// Converts a Date to the UTC datetime string required by iCalendar: YYYYMMDDTHHmmSSZ
function toUtcDateTime(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildValarm(alert: CalendarAlert): string[] {
    return [
        'BEGIN:VALARM',
        `TRIGGER;VALUE=DATE-TIME:${toUtcDateTime(alert.triggerAt)}`,
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(alert.description)}`,
        'END:VALARM',
    ];
}

/**
 * Returns an iCalendar (.ics) string for an all-day event.
 * Alerts use absolute UTC datetime triggers (TRIGGER;VALUE=DATE-TIME).
 * Based on https://icalendar.org/
 */
export function ics(event: CalendarEvent): string {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const start = toAllDayDate(event.date);
    const end = toAllDayDate(new Date(event.date.getTime() + MS_PER_DAY));
    const uid = `${event.title.replace(/\s+/g, '-').toLowerCase()}-${start}@iota-names`;

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//IOTA Names//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${escapeText(event.title)}`,
        `DESCRIPTION:${escapeText(event.description)}`,
        ...(event.alerts?.flatMap(buildValarm) ?? []),
        'END:VEVENT',
        'END:VCALENDAR',
    ];

    return lines.join('\r\n');
}
