// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export function dateStr(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

export function subtractWeeks(date: Date, weeks: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - weeks * 7);
    return result;
}

// Clamps to the last day of the target month to avoid JS setMonth overflow
// (e.g. March 31 - 1 month → Feb 31 → March 3 without the clamp).
export function subtractMonths(date: Date, months: number): Date {
    const result = new Date(date);
    const targetDay = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() - months);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(targetDay, lastDay));
    return result;
}
