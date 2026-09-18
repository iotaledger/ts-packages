// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { formatDate, type Format, useTimeAgo } from '@iota/core';
import { type DateFormat, type DateType, useDateFormat } from '~/contexts/dateFormatContext';

const ABSOLUTE_FORMAT: Format[] = ['day', 'month', 'year', 'hour', 'minute', 'second'];

export interface FormattedDateResult {
    displayed: string;
    format: DateFormat;
    cycle: () => void;
}

export function useFormattedDate(
    type: DateType,
    timestampMs: number | null,
    showTimeAgo = false,
): FormattedDateResult {
    const { format, cycle } = useDateFormat(type);
    const relativeText = useTimeAgo({ timeFrom: timestampMs, shortedTimeLabel: false });

    let displayed: string;
    if (!timestampMs) {
        displayed = '--';
    } else if (format === 'default') {
        displayed = relativeText || '--';
    } else {
        const timeZone = format === 'utc' ? 'UTC' : undefined;
        const absolute = formatDate(timestampMs, ABSOLUTE_FORMAT, timeZone);
        displayed = showTimeAgo && relativeText ? `${absolute} (${relativeText})` : absolute;
    }

    return { displayed, format, cycle };
}
