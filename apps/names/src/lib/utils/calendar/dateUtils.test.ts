// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { subtractMonths, subtractWeeks } from './dateUtils';

describe('subtractWeeks', () => {
    it('subtracts exactly 7 days per week', () => {
        const date = new Date(2026, 0, 15); // Jan 15
        expect(subtractWeeks(date, 1).getDate()).toBe(8);
        expect(subtractWeeks(date, 1).getMonth()).toBe(0);
    });

    it('rolls back across a month boundary', () => {
        const date = new Date(2026, 1, 3); // Feb 3
        const result = subtractWeeks(date, 1);
        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(0); // January
        expect(result.getDate()).toBe(27);
    });

    it('rolls back across a year boundary', () => {
        const date = new Date(2026, 0, 5); // Jan 5
        const result = subtractWeeks(date, 1);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(11); // December
        expect(result.getDate()).toBe(29);
    });

    it('does not mutate the input date', () => {
        const date = new Date(2026, 0, 15);
        subtractWeeks(date, 1);
        expect(date.getDate()).toBe(15);
    });

    it('supports multiple weeks', () => {
        const date = new Date(2026, 0, 29); // Jan 29
        const result = subtractWeeks(date, 2);
        expect(result.getMonth()).toBe(0);
        expect(result.getDate()).toBe(15);
    });
});

describe('subtractMonths', () => {
    it('subtracts one month from a mid-month date', () => {
        const date = new Date(2026, 2, 15); // March 15
        const result = subtractMonths(date, 1);
        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(1); // February
        expect(result.getDate()).toBe(15);
    });

    it('clamps to last day of month when source day overflows (31st → Feb)', () => {
        const date = new Date(2026, 2, 31); // March 31
        const result = subtractMonths(date, 1);
        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(1); // February
        expect(result.getDate()).toBe(28); // 2026 is not a leap year
    });

    it('clamps to Feb 29 on a leap year', () => {
        const date = new Date(2024, 2, 31); // March 31, 2024
        const result = subtractMonths(date, 1);
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(1); // February
        expect(result.getDate()).toBe(29); // 2024 is a leap year
    });

    it('clamps to last day when subtracting from Jan 31 → Dec 31 (no overflow)', () => {
        const date = new Date(2026, 0, 31); // Jan 31
        const result = subtractMonths(date, 1);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(11); // December
        expect(result.getDate()).toBe(31);
    });

    it('rolls back across a year boundary', () => {
        const date = new Date(2026, 1, 15); // Feb 15
        const result = subtractMonths(date, 2);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(11); // December
        expect(result.getDate()).toBe(15);
    });

    it('does not mutate the input date', () => {
        const date = new Date(2026, 2, 31);
        subtractMonths(date, 1);
        expect(date.getDate()).toBe(31);
        expect(date.getMonth()).toBe(2);
    });
});
