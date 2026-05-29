// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { NAVBAR_ITEM_PATHS } from './navigation';

export const HOME_PATH = NAVBAR_ITEM_PATHS.home;

const TAB_BAR_PATHS = new Set<string>(
    Object.values(NAVBAR_ITEM_PATHS).filter((p) => p !== HOME_PATH),
);

const NavigationDepthContext = createContext<number>(0);

export function NavigationStackProvider({ children }: { children: ReactNode }) {
    const [depth, setDepth] = useState(0);
    const location = useLocation();
    const navigationType = useNavigationType();

    useEffect(() => {
        const hasMenuParam = new URLSearchParams(location.search).has('menu');
        const isHome =
            !hasMenuParam &&
            (location.pathname === HOME_PATH || location.pathname.startsWith(HOME_PATH + '/'));
        const isTabBar = !hasMenuParam && TAB_BAR_PATHS.has(location.pathname);

        if (isHome) {
            setDepth(0);
        } else if (isTabBar) {
            setDepth(1);
        } else if (navigationType === 'PUSH') {
            setDepth((prev) => prev + 1);
        } else if (navigationType === 'POP') {
            setDepth((prev) => Math.max(0, prev - 1));
        }
    }, [location.key, navigationType]);

    return (
        <NavigationDepthContext.Provider value={depth}>{children}</NavigationDepthContext.Provider>
    );
}

export function useNavigationDepth(): number {
    return useContext(NavigationDepthContext);
}
