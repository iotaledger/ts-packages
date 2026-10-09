// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { NAVBAR_ITEM_PATHS } from './navigation';

export const HOME_PATH = NAVBAR_ITEM_PATHS.home;

export const TAB_BAR_PATHS = new Set<string>(
    Object.values(NAVBAR_ITEM_PATHS).filter((p) => p !== HOME_PATH),
);

const NavigationDepthContext = createContext<number>(0);

function getRootDepth({ pathname, search }: { pathname: string; search: string }): number | null {
    if (new URLSearchParams(search).has('menu')) return null;
    if (pathname === HOME_PATH || pathname.startsWith(HOME_PATH + '/')) return 0;
    if (TAB_BAR_PATHS.has(pathname)) return 1;
    return null;
}

function getHistoryIndex(): number {
    return window.history.state?.idx ?? 0;
}

export function NavigationStackProvider({ children }: { children: ReactNode }) {
    const location = useLocation();
    const navigationType = useNavigationType();
    const initialRootDepth = getRootDepth(location);
    const [depth, setDepth] = useState(() => initialRootDepth ?? Math.min(2, getHistoryIndex()));
    const lastLocationKey = useRef(location.key);
    const minPopDepth = useRef(initialRootDepth === null ? 2 : 1);

    useEffect(() => {
        if (lastLocationKey.current === location.key) return;
        lastLocationKey.current = location.key;

        const rootDepth = getRootDepth(location);
        if (rootDepth !== null) {
            minPopDepth.current = 1;
            setDepth(rootDepth);
            return;
        }

        const maxDepth = getHistoryIndex();
        if (navigationType === 'PUSH') {
            setDepth((prev) => Math.min(maxDepth, prev + 1));
        } else if (navigationType === 'POP') {
            setDepth((prev) => Math.min(maxDepth, Math.max(minPopDepth.current, prev - 1)));
        }
        // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key, navigationType]);

    return (
        <NavigationDepthContext.Provider value={depth}>{children}</NavigationDepthContext.Provider>
    );
}

export function useNavigationDepth(): number {
    return useContext(NavigationDepthContext);
}
