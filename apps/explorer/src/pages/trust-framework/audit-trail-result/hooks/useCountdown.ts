// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react';

/**
 * String-returning hook for managing lock countdowns.
 * Returns the formatted string for the UI (e.g. "2d 4h 5m remaining").
 */
export function useCountdownFormatted(targetDate: Date): string {
    const [now, setNow] = useState(() => Date.now());
    const isPast = targetDate.getTime() - now <= 0;

    useEffect(() => {
        if (isPast) return;
        const interval = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(interval);
    }, [isPast]);

    if (isPast) return 'Expired';

    const diffMs = targetDate.getTime() - now;
    const totalMinutes = Math.floor(diffMs / 60_000);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const days = Math.floor(totalHours / 24);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(' ') + ' remaining' : 'Less than a minute';
}
