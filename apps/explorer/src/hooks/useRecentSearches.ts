// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'iota-explorer-recent-searches';
const MAX_RECENT_SEARCHES = 6;

function readRecentSearches(): string[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return [];
        }
        const parsed: unknown = JSON.parse(stored);
        return Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === 'string')
            : [];
    } catch {
        return [];
    }
}

function writeRecentSearches(searches: string[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
    } catch {
        // ignore write failures (private mode / quota)
    }
}

export function useRecentSearches(): {
    recentSearches: string[];
    addRecentSearch: (query: string) => void;
    clearRecentSearches: () => void;
} {
    const [recentSearches, setRecentSearches] = useState<string[]>(readRecentSearches);

    const addRecentSearch = useCallback((query: string) => {
        const trimmed = query.trim();
        if (!trimmed) {
            return;
        }
        const next = [trimmed, ...readRecentSearches().filter((item) => item !== trimmed)].slice(
            0,
            MAX_RECENT_SEARCHES,
        );
        writeRecentSearches(next);
        setRecentSearches(next);
    }, []);

    const clearRecentSearches = useCallback(() => {
        writeRecentSearches([]);
        setRecentSearches([]);
    }, []);

    return { recentSearches, addRecentSearch, clearRecentSearches };
}
