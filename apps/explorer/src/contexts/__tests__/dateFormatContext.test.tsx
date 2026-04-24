// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { DateFormatProvider, useDateFormat } from '../dateFormatContext';

const LS_KEY = 'iota-explorer:date-format';

function wrapper({ children }: { children: ReactNode }) {
    return <DateFormatProvider>{children}</DateFormatProvider>;
}

describe('DateFormatProvider / useDateFormat', () => {
    beforeEach(() => localStorage.clear());

    it('returns default format when no preference is stored', () => {
        const { result } = renderHook(() => useDateFormat('epoch'), { wrapper });
        expect(result.current.format).toBe('default');
    });

    it('reads an existing valid preference from localStorage on mount', () => {
        localStorage.setItem(LS_KEY, JSON.stringify({ epoch: 'utc' }));
        const { result } = renderHook(() => useDateFormat('epoch'), { wrapper });
        expect(result.current.format).toBe('utc');
    });

    it('falls back to default when localStorage contains an unknown format value', () => {
        localStorage.setItem(LS_KEY, JSON.stringify({ epoch: 'bad-value' }));
        const { result } = renderHook(() => useDateFormat('epoch'), { wrapper });
        expect(result.current.format).toBe('default');
    });

    it('falls back to default when localStorage contains non-object JSON', () => {
        localStorage.setItem(LS_KEY, '"just-a-string"');
        const { result } = renderHook(() => useDateFormat('epoch'), { wrapper });
        expect(result.current.format).toBe('default');
    });

    it('cycles default → local → utc → default', () => {
        const { result } = renderHook(() => useDateFormat('epoch'), { wrapper });

        expect(result.current.format).toBe('default');
        act(() => result.current.cycle());
        expect(result.current.format).toBe('local');
        act(() => result.current.cycle());
        expect(result.current.format).toBe('utc');
        act(() => result.current.cycle());
        expect(result.current.format).toBe('default');
    });

    it('persists the updated format to localStorage', () => {
        const { result } = renderHook(() => useDateFormat('epoch'), { wrapper });
        act(() => result.current.cycle());
        const stored = JSON.parse(localStorage.getItem(LS_KEY)!);
        expect(stored.epoch).toBe('local');
    });

    it('cycles different types independently within the same provider', () => {
        const { result } = renderHook(
            () => ({ epoch: useDateFormat('epoch'), table: useDateFormat('table') }),
            { wrapper },
        );

        act(() => result.current.epoch.cycle());
        expect(result.current.epoch.format).toBe('local');
        expect(result.current.table.format).toBe('default');
    });
});
