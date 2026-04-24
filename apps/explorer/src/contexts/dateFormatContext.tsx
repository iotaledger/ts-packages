// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export const GLOBAL_DATE_TYPE = 'global' as const;

export const DATE_TYPES = [
    'transaction',
    'epoch',
    'checkpoint',
    'package',
    'table',
    'graph',
    GLOBAL_DATE_TYPE,
] as const;

export type DateType = (typeof DATE_TYPES)[number];

export type DateFormat = 'default' | 'local' | 'utc';

const LS_KEY = 'iota-explorer:date-format';
const CYCLE: DateFormat[] = ['default', 'local', 'utc'];
const DEFAULT_FORMAT: DateFormat = 'default';

type DateFormatMap = Partial<Record<DateType, DateFormat>>;

function isValidDateFormatMap(v: unknown): v is DateFormatMap {
    if (typeof v !== 'object' || v === null) return false;
    return Object.values(v).every((f) => CYCLE.includes(f as DateFormat));
}

interface DateFormatContextValue {
    formats: DateFormatMap;
    cycle: (type: DateType) => void;
}

function readFromStorage(): DateFormatMap {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        return isValidDateFormatMap(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function writeToStorage(map: DateFormatMap): void {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(map));
    } catch {
        // storage unavailable (private mode, quota exceeded)
    }
}

const DateFormatContext = createContext<DateFormatContextValue>({
    formats: {},
    cycle: () => {},
});

export function DateFormatProvider({ children }: { children: ReactNode }): JSX.Element {
    const [formats, setFormats] = useState<DateFormatMap>(() => readFromStorage());

    const cycle = useCallback((type: DateType) => {
        setFormats((prev) => {
            const current = prev[type] ?? DEFAULT_FORMAT;
            const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
            return { ...prev, [type]: next };
        });
    }, []);

    useEffect(() => {
        writeToStorage(formats);
    }, [formats]);

    return (
        <DateFormatContext.Provider value={{ formats, cycle }}>
            {children}
        </DateFormatContext.Provider>
    );
}

export function useDateFormat(type: DateType): { format: DateFormat; cycle: () => void } {
    const { formats, cycle } = useContext(DateFormatContext);
    return {
        format: formats[type] ?? DEFAULT_FORMAT,
        cycle: () => cycle(type),
    };
}
