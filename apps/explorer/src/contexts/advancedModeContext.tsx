// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export const ADVANCED_MODE_LS_KEY = 'iota-explorer:advanced-mode';

interface AdvancedModeContextValue {
    isAdvancedMode: boolean;
    toggle: () => void;
}

function readFromStorage(): boolean {
    try {
        return localStorage.getItem(ADVANCED_MODE_LS_KEY) === 'true';
    } catch {
        return false;
    }
}

function writeToStorage(value: boolean): void {
    try {
        localStorage.setItem(ADVANCED_MODE_LS_KEY, String(value));
    } catch {
        // storage unavailable (private mode, quota exceeded)
    }
}

const AdvancedModeContext = createContext<AdvancedModeContextValue>({
    isAdvancedMode: false,
    toggle: () => {},
});

export function AdvancedModeProvider({ children }: { children: ReactNode }): JSX.Element {
    const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(() => readFromStorage());

    const toggle = useCallback(() => {
        setIsAdvancedMode((prev) => !prev);
    }, []);

    useEffect(() => {
        writeToStorage(isAdvancedMode);
    }, [isAdvancedMode]);

    return (
        <AdvancedModeContext.Provider value={{ isAdvancedMode, toggle }}>
            {children}
        </AdvancedModeContext.Provider>
    );
}

export function useAdvancedMode(): AdvancedModeContextValue {
    return useContext(AdvancedModeContext);
}
