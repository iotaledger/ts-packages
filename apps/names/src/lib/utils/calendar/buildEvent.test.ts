// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { at9am, buildEvent } from './buildEvent';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('at9am', () => {
    it('sets hours to 9 and zeroes minutes, seconds, milliseconds', () => {
        const d = new Date(2026, 2, 15, 14, 30, 45, 500);
        const result = at9am(d);
        expect(result.getHours()).toBe(9);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
    });

    it('does not mutate the input date', () => {
        const d = new Date(2026, 2, 15, 14, 0, 0, 0);
        at9am(d);
        expect(d.getHours()).toBe(14);
    });
});

describe('buildEvent', () => {
    const expiration = new Date(2026, 5, 15); // June 15, 2026

    it('returns 4 alerts', () => {
        const event = buildEvent('test.iota', expiration);
        expect(event.alerts).toHaveLength(4);
    });

    it('sets event date to the expiration date', () => {
        const event = buildEvent('test.iota', expiration);
        expect(event.date).toBe(expiration);
    });

    it('title includes the name', () => {
        const event = buildEvent('test.iota', expiration);
        expect(event.title).toContain('test');
    });

    it('description references iotanames.com', () => {
        const event = buildEvent('test.iota', expiration);
        expect(event.description).toContain('iotanames.com');
    });

    it('alerts are ordered from earliest to latest', () => {
        const event = buildEvent('test.iota', expiration);
        const times = event.alerts!.map((a) => a.triggerAt.getTime());
        expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it('all alert triggers are at 09:00', () => {
        const event = buildEvent('test.iota', expiration);
        for (const alert of event.alerts!) {
            expect(alert.triggerAt.getHours()).toBe(9);
            expect(alert.triggerAt.getMinutes()).toBe(0);
            expect(alert.triggerAt.getSeconds()).toBe(0);
        }
    });

    it('one-month alert is roughly 30 days before expiration', () => {
        const event = buildEvent('test.iota', expiration);
        const diffDays = (expiration.getTime() - event.alerts![0].triggerAt.getTime()) / MS_PER_DAY;
        expect(diffDays).toBeGreaterThanOrEqual(28);
        expect(diffDays).toBeLessThanOrEqual(31);
    });

    it('one-week alert is exactly 7 days before expiration (at 9am)', () => {
        const event = buildEvent('test.iota', expiration);
        const expected = new Date(expiration);
        expected.setDate(expected.getDate() - 7);
        expected.setHours(9, 0, 0, 0);
        expect(event.alerts![1].triggerAt.getTime()).toBe(expected.getTime());
    });

    it('one-day alert is exactly 1 day before expiration (at 9am)', () => {
        const event = buildEvent('test.iota', expiration);
        const expected = new Date(expiration);
        expected.setDate(expected.getDate() - 1);
        expected.setHours(9, 0, 0, 0);
        expect(event.alerts![2].triggerAt.getTime()).toBe(expected.getTime());
    });

    it('expiry-day alert is on the expiration date at 9am', () => {
        const event = buildEvent('test.iota', expiration);
        const expected = new Date(expiration);
        expected.setHours(9, 0, 0, 0);
        expect(event.alerts![3].triggerAt.getTime()).toBe(expected.getTime());
    });

    it('one-month alert clamps correctly for names expiring on the 31st (Feb overflow)', () => {
        const march31 = new Date(2026, 2, 31); // March 31
        const event = buildEvent('test.iota', march31);
        const oneMonthAlert = event.alerts![0].triggerAt;
        // Should be Feb 28 at 9am (2026 is not a leap year), not March 3
        expect(oneMonthAlert.getMonth()).toBe(1); // February
        expect(oneMonthAlert.getDate()).toBe(28);
    });
});
