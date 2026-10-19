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
    const anchor = useRef({
        idx: getHistoryIndex(),
        depth: initialRootDepth ?? Math.min(2, getHistoryIndex()),
    });
    const [depth, setDepth] = useState(anchor.current.depth);
    const lastLocationKey = useRef(location.key);
    const minPopDepth = useRef(initialRootDepth === null ? 2 : 1);

    useEffect(() => {
        if (lastLocationKey.current === location.key) return;
        lastLocationKey.current = location.key;

        const rootDepth = getRootDepth(location);
        if (rootDepth !== null) {
            minPopDepth.current = 1;
            anchor.current = { idx: getHistoryIndex(), depth: rootDepth };
            setDepth(rootDepth);
            return;
        }

        if (navigationType === 'PUSH' || navigationType === 'POP') {
            const idx = getHistoryIndex();
            const relative = anchor.current.depth + (idx - anchor.current.idx);
            setDepth(Math.max(Math.min(minPopDepth.current, idx), relative));
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
