// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { DateFormatProvider } from '~/contexts/dateFormatContext';
import { DateDisplay } from '../DateDisplay';

vi.mock('@iota/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@iota/core')>();
    return { ...actual, useTimeAgo: () => '5 mins ago' };
});

const TIMESTAMP = 1_735_693_990_000;

function wrapper({ children }: { children: ReactNode }) {
    return <DateFormatProvider>{children}</DateFormatProvider>;
}

describe('DateDisplay', () => {
    beforeEach(() => localStorage.clear());

    it('renders relative time text by default', () => {
        const { getByRole } = render(<DateDisplay timestamp={TIMESTAMP} />, { wrapper });
        expect(getByRole('button')).toHaveTextContent('5 mins ago');
    });

    it('shows -- when timestamp is 0', () => {
        const { getByRole } = render(<DateDisplay timestamp={0} />, { wrapper });
        expect(getByRole('button')).toHaveTextContent('--');
    });

    it('wraps content in a relative span when showTooltip is true (default)', () => {
        const { container } = render(<DateDisplay timestamp={TIMESTAMP} />, { wrapper });
        expect(container.firstChild).toHaveClass('relative');
    });

    it('returns a bare <time> element with no wrapper span when showTooltip=false', () => {
        const { container } = render(<DateDisplay timestamp={TIMESTAMP} showTooltip={false} />, {
            wrapper,
        });
        expect(container.firstChild?.nodeName).toBe('TIME');
    });

    it('is keyboard-focusable with role=button and tabIndex=0', () => {
        const { getByRole } = render(<DateDisplay timestamp={TIMESTAMP} />, { wrapper });
        const btn = getByRole('button');
        expect(btn).toHaveAttribute('tabindex', '0');
        expect(btn.tagName.toLowerCase()).toBe('time');
    });

    it('omits hover classes when showHoverStyle=false', () => {
        const { getByRole } = render(<DateDisplay timestamp={TIMESTAMP} showHoverStyle={false} />, {
            wrapper,
        });
        expect(getByRole('button').className).not.toMatch(/hover:/);
    });

    it('switches away from relative text after a click', () => {
        const { getByRole } = render(<DateDisplay timestamp={TIMESTAMP} />, { wrapper });
        fireEvent.click(getByRole('button'));
        expect(getByRole('button')).not.toHaveTextContent('5 mins ago');
    });

    it('cycles format on Enter key', () => {
        const { getByRole } = render(<DateDisplay timestamp={TIMESTAMP} />, { wrapper });
        fireEvent.keyDown(getByRole('button'), { key: 'Enter' });
        expect(getByRole('button')).not.toHaveTextContent('5 mins ago');
    });

    it('cycles format on Space key', () => {
        const { getByRole } = render(<DateDisplay timestamp={TIMESTAMP} />, { wrapper });
        fireEvent.keyDown(getByRole('button'), { key: ' ' });
        expect(getByRole('button')).not.toHaveTextContent('5 mins ago');
    });

    it('shows the new format label in the tooltip immediately after click', () => {
        const { getByRole, getByText } = render(<DateDisplay timestamp={TIMESTAMP} />, {
            wrapper,
        });
        fireEvent.click(getByRole('button'));
        expect(getByText('Local time')).toBeInTheDocument();
    });

    it('cycles fully: default → local → utc → default across three clicks', () => {
        const { getByRole } = render(<DateDisplay timestamp={TIMESTAMP} />, {
            wrapper,
        });
        const btn = getByRole('button');

        // Start: relative
        expect(btn).toHaveTextContent('5 mins ago');

        // → local (absolute, no relative suffix since showTimeAgo defaults to false)
        fireEvent.click(btn);
        expect(btn).not.toHaveTextContent('5 mins ago');
        const localText = btn.textContent!;

        // → utc (absolute)
        fireEvent.click(btn);
        expect(btn).not.toHaveTextContent('5 mins ago');
        // UTC and local differ (unless the test machine runs on UTC, so just check it's absolute)
        expect(btn.textContent).not.toBe('');

        // → default (back to relative)
        fireEvent.click(btn);
        expect(btn).toHaveTextContent('5 mins ago');

        // local text from first cycle should not equal current relative text
        expect(localText).not.toBe('5 mins ago');
    });
});
