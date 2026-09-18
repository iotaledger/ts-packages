// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { normalizeIotaName } from '@iota/iota-names-sdk';

import { formatDate } from '@/lib/utils/format/formatDate';

import { subtractMonths, subtractWeeks } from './dateUtils';
import type { CalendarEvent } from './types';

export function at9am(date: Date): Date {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    return d;
}

export function buildEvent(name: string, expirationDate: Date): CalendarEvent {
    const displayName = normalizeIotaName(name);

    const oneMonthBefore = subtractMonths(expirationDate, 1);
    const oneWeekBefore = subtractWeeks(expirationDate, 1);
    const oneDayBefore = new Date(expirationDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    return {
        title: `${displayName} – Renewal Reminder`,
        description: `Your IOTA name ${displayName} expires on ${formatDate(expirationDate)}. Remember to renew it at iotanames.com.`,
        date: expirationDate,
        alerts: [
            {
                triggerAt: at9am(oneMonthBefore),
                description: `1 month until ${displayName} expires`,
            },
            { triggerAt: at9am(oneWeekBefore), description: `1 week until ${displayName} expires` },
            { triggerAt: at9am(oneDayBefore), description: `1 day until ${displayName} expires` },
            { triggerAt: at9am(expirationDate), description: `${displayName} expires today` },
        ],
    };
}
