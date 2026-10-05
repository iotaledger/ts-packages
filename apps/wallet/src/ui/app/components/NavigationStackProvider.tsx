// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { useLocation, useNavigate, useNavigationType, NavigationType } from 'react-router-dom';
import { NAVBAR_ITEM_PATHS } from './navigation';

export const HOME_PATH = NAVBAR_ITEM_PATHS.home;

export const TAB_BAR_PATHS = new Set<string>(
    Object.values(NAVBAR_ITEM_PATHS).filter((p) => p !== HOME_PATH),
);

const NAVIGATION_HISTORY_SESSION_KEY = 'navigation-history';

type RouteKind = 'home' | 'tabBar' | 'other';

interface HistoryEntry {
    pathname: string;
    depth: number;
}

interface NavigationHistory {
    idx: number;
    entries: (HistoryEntry | null)[];
}

function getRouteKind(pathname: string, search: string): RouteKind {
    const hasMenuParam = new URLSearchParams(search).has('menu');
    if (hasMenuParam) return 'other';
    if (pathname === HOME_PATH || pathname.startsWith(HOME_PATH + '/')) return 'home';
    if (TAB_BAR_PATHS.has(pathname)) return 'tabBar';
    return 'other';
}

const FALLBACK_DEPTH_BY_ROUTE_KIND: Record<RouteKind, number> = {
    home: 0,
    tabBar: 1,
    other: 2,
};

function getHistoryIndex(): number {
    const idx = window.history.state?.idx;
    return typeof idx === 'number' ? idx : 0;
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
    const entry = value as Partial<HistoryEntry> | null;
    return typeof entry?.pathname === 'string' && typeof entry.depth === 'number';
}

function readStoredEntries(): (HistoryEntry | null)[] {
    try {
        const raw = sessionStorage.getItem(NAVIGATION_HISTORY_SESSION_KEY);
        if (!raw) return [];
        const stored: unknown = JSON.parse(raw);
        return Array.isArray(stored) &&
            stored.every((item) => item === null || isHistoryEntry(item))
            ? stored
            : [];
    } catch {
        return [];
    }
}

function writeStoredEntries(entries: (HistoryEntry | null)[]) {
    try {
        sessionStorage.setItem(NAVIGATION_HISTORY_SESSION_KEY, JSON.stringify(entries));
    } catch {
        return;
    }
}

function resolveEntries(
    prev: (HistoryEntry | null)[],
    idx: number,
    pathname: string,
    search: string,
    navigationType: NavigationType,
): (HistoryEntry | null)[] {
    const known = prev[idx];
    if (navigationType === NavigationType.Pop && known?.pathname === pathname) return prev;

    const routeKind = getRouteKind(pathname, search);
    const previous = prev[idx - 1];
    let depth = FALLBACK_DEPTH_BY_ROUTE_KIND[routeKind];
    if (routeKind === 'home') {
        depth = 0;
    } else if (routeKind === 'tabBar') {
        depth = 1;
    } else if (navigationType === NavigationType.Push && previous) {
        depth = previous.depth + 1;
    } else if (navigationType === NavigationType.Replace && known) {
        depth = known.depth;
    }

    if (navigationType === NavigationType.Push) {
        const base = Array.from({ length: idx }, (_, i) => prev[i] ?? null);
        return [...base, { pathname, depth }];
    }
    const next = Array.from({ length: Math.max(prev.length, idx + 1) }, (_, i) => prev[i] ?? null);
    next[idx] = { pathname, depth };
    return next;
}

interface NavigationStackContextValue {
    depth: number;
    goBackTo: (path: string) => void;
}

const NavigationStackContext = createContext<NavigationStackContextValue>({
    depth: 0,
    goBackTo: () => {},
});

export function NavigationStackProvider({ children }: { children: ReactNode }) {
    const location = useLocation();
    const navigate = useNavigate();
    const navigationType = useNavigationType();
    const [history, setHistory] = useState<NavigationHistory>(() => {
        const idx = getHistoryIndex();
        return {
            idx,
            entries: resolveEntries(
                readStoredEntries(),
                idx,
                location.pathname,
                location.search,
                NavigationType.Pop,
            ),
        };
    });

    useEffect(() => {
        setHistory((prev) => {
            const idx = getHistoryIndex();
            return {
                idx,
                entries: resolveEntries(
                    prev.entries,
                    idx,
                    location.pathname,
                    location.search,
                    navigationType,
                ),
            };
        });
        // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key, navigationType]);

    useEffect(() => {
        writeStoredEntries(history.entries);
    }, [history.entries]);

    const depth = history.entries[history.idx]?.depth ?? 0;

    const goBackTo = useCallback(
        (path: string) => {
            const targetIdx = history.entries.findLastIndex(
                (entry, i) => i < history.idx && entry?.pathname === path,
            );
            if (targetIdx === -1) {
                navigate(path, { replace: true });
            } else {
                navigate(targetIdx - history.idx);
            }
        },
        [history, navigate],
    );

    const value = useMemo(() => ({ depth, goBackTo }), [depth, goBackTo]);

    return (
        <NavigationStackContext.Provider value={value}>{children}</NavigationStackContext.Provider>
    );
}

export function useNavigationDepth(): number {
    return useContext(NavigationStackContext).depth;
}

export function useGoBackTo(): (path: string) => void {
    return useContext(NavigationStackContext).goBackTo;
}
