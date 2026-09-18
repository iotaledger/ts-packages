// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import cx from 'clsx';

import { LinkWithQuery, useNavigateWithQuery } from '~/components/ui';
import { Badge, BadgeSize, BadgeType, LoadingIndicator, type Suggestion } from '@iota/apps-ui-kit';
import { Close, Search as SearchIcon } from '@iota/apps-ui-icons';
import { formatAddress, isValidIotaAddress } from '@iota/iota-sdk/utils';
import { useDebouncedValue } from '~/hooks/useDebouncedValue';
import { useRecentSearches } from '~/hooks/useRecentSearches';
import { useSearch } from '~/hooks/useSearch';
import { ampli } from '~/lib/utils';
import { trimAuditTrailNotalizationSuffix } from './utils';

interface SearchProps {
    onSelectResult?: () => void;
    autoFocus?: boolean;
}

export function Search({ onSelectResult, autoFocus }: SearchProps): JSX.Element {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const trimmedQuery = query.trim();
    const debouncedQuery = useDebouncedValue(trimmedQuery);
    const { isPending, data: results } = useSearch(debouncedQuery);
    const { recentSearches, addRecentSearch } = useRecentSearches();
    const navigate = useNavigateWithQuery();

    const isLoading = !!debouncedQuery && (isPending || debouncedQuery !== trimmedQuery);
    const hasResults = !!results?.length;
    const inputRef = useRef<HTMLInputElement>(null);
    const recentPillsRef = useRef<HTMLButtonElement | null>(null);

    const handleClickResult = useCallback(
        (result: Suggestion) => {
            if (result) {
                ampli.clickedSearchResult({
                    searchQuery: result.id,
                    searchCategory: result.type,
                });
                addRecentSearch(query);
                navigate(
                    `/${result.type}/${encodeURIComponent(trimAuditTrailNotalizationSuffix(result.id))}`,
                    {},
                );
                setQuery('');
                onSelectResult?.();
            }
        },
        [addRecentSearch, onSelectResult, query],
    );

    const handleInputKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            event.preventDefault();

            if (!results?.length) {
                if (event.key === 'Tab' || event.key === 'ArrowDown') {
                    recentPillsRef?.current?.focus();
                }
                return;
            }

            if (event.key === 'ArrowDown') {
                setActiveIndex((index) => (index + 1) % results.length);
            } else if (event.key === 'ArrowUp') {
                setActiveIndex((index) => (index - 1 + results.length) % results.length);
            } else if (event.key === 'Enter') {
                const result = results[Math.min(activeIndex, results.length - 1)];
                if (result) handleClickResult(result);
            }
        },
        [results, activeIndex, handleClickResult, debouncedQuery],
    );

    useEffect(() => {
        if (debouncedQuery) {
            ampli.completedSearch({ searchQuery: debouncedQuery });
            setActiveIndex(0);
        }
    }, [debouncedQuery]);

    return (
        <div className="flex flex-col gap-lg">
            <div className="flex h-14 items-center gap-sm rounded-full border border-shader-neutral-light-16 bg-shader-neutral-light-8 px-lg dark:border-shader-neutral-dark-16 dark:bg-shader-neutral-dark-8">
                <SearchIcon className="h-6 w-6 shrink-0 text-iota-neutral-40" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Search for an IOTA @name, transaction, object..."
                    className="w-full bg-transparent text-title-lg text-iota-neutral-10 placeholder:text-title-md placeholder:text-iota-neutral-40 focus:outline-none dark:text-iota-neutral-92"
                    autoFocus={autoFocus}
                    aria-label="Search for an IOTA name, transaction, or object"
                    data-testid="Search input"
                />
                {query ? (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                        className="state-layer relative shrink-0 rounded-full p-xs text-iota-neutral-40"
                    >
                        <Close className="h-5 w-5" />
                    </button>
                ) : null}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-md">
                    <LoadingIndicator />
                </div>
            ) : hasResults ? (
                <div className="flex w-full flex-col gap-xs">
                    {results.map((result, index) => {
                        const url = `/${result.type}/${encodeURIComponent(trimAuditTrailNotalizationSuffix(result.id))}`;
                        return (
                            <LinkWithQuery
                                key={url}
                                to={url}
                                onClick={() => handleClickResult(result)}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={cx(
                                    'state-layer relative flex w-full items-center justify-between gap-md rounded-2xl px-lg py-md text-start',
                                    index === activeIndex
                                        ? 'bg-shader-neutral-light-16 dark:bg-shader-neutral-dark-16'
                                        : 'bg-shader-neutral-light-8 dark:bg-shader-neutral-dark-8',
                                )}
                            >
                                <span className="truncate text-body-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                                    {result.label}
                                </span>
                                <span className="whitespace-nowrap">
                                    <Badge
                                        type={BadgeType.Neutral}
                                        size={BadgeSize.Small}
                                        label={result.type.toUpperCase()}
                                    />
                                </span>
                            </LinkWithQuery>
                        );
                    })}
                </div>
            ) : debouncedQuery ? (
                <div className="py-md text-center text-body-md text-iota-neutral-40">
                    No results found
                </div>
            ) : recentSearches.length ? (
                <div className="flex flex-col gap-sm">
                    <span className="text-label-lg text-iota-neutral-40">Recent</span>
                    <div className="flex flex-wrap gap-xs">
                        {recentSearches.map((recent, index) => (
                            <button
                                ref={index === 0 ? recentPillsRef : null}
                                key={recent}
                                type="button"
                                onClick={() => {
                                    setQuery(recent);
                                    inputRef.current?.focus();
                                }}
                                className="state-layer relative max-w-[220px] truncate rounded-full border border-shader-neutral-light-16 px-md py-xs text-body-md text-iota-neutral-10 dark:border-shader-neutral-dark-16 dark:text-iota-neutral-92"
                            >
                                {isValidIotaAddress(recent) ? formatAddress(recent) : recent}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
