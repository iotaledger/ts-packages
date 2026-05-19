// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useState } from 'react';

import { useNavigateWithQuery } from '~/components/ui';
import { ListItem, Search as SearchBox, type Suggestion } from '@iota/apps-ui-kit';
import { useDebouncedValue } from '~/hooks/useDebouncedValue';
import { useSearch } from '~/hooks/useSearch';
import { ampli } from '~/lib/utils';

/**
 * Extract an ID without a dash, if it is present as a suffix.
 *
 * CONTEXT: Search result `id` is used as React element key and must be unique,
 * because of this, search result now comes with a suffix like `-notarization` or
 * `-identity`, which must be ripped off as this is invalid network ID.
 *
 * @example
 *    extractOnlyTheId('0x123-audit-trail')
 *    // output: '0x123'
 * @example
 *    extractOnlyTheId('0x123-identity')
 *    // output: '0x123'
 * @example
 *    extractOnlyTheId('0x123')
 *    // output: '0x123'
 */
function extractOnlyTheId(possibleDashedId: string): string {
    const dashAt = possibleDashedId.indexOf('-') || -1;
    return dashAt > -1 ? possibleDashedId.slice(0, dashAt) : possibleDashedId;
}

export function Search(): JSX.Element {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebouncedValue(query);
    const { isPending, data: results } = useSearch(debouncedQuery);
    const navigate = useNavigateWithQuery();
    const handleSelectResult = useCallback(
        (result: Suggestion) => {
            if (result) {
                ampli.clickedSearchResult({
                    searchQuery: result.id,
                    searchCategory: result.type,
                });
                navigate(`/${result.type}/${encodeURIComponent(extractOnlyTheId(result.id))}`, {});
                setQuery('');
            }
        },
        [navigate],
    );

    useEffect(() => {
        if (debouncedQuery) {
            ampli.completedSearch({
                searchQuery: debouncedQuery,
            });
        }
    }, [debouncedQuery]);

    return (
        <SearchBox
            searchValue={query}
            onSearchValueChange={(value) => setQuery(value?.trim() ?? '')}
            onSuggestionClick={handleSelectResult}
            placeholder="Search"
            isLoading={isPending || debouncedQuery !== query}
            suggestions={results}
            renderSuggestion={(suggestion) => (
                <div className="flex cursor-pointer justify-between">
                    <ListItem hideBottomBorder>
                        <div className="overflow-hidden text-ellipsis">{suggestion.label}</div>
                        <div className="text-caption text-steel break-words pl-xs font-medium uppercase">
                            {suggestion.type}
                        </div>
                    </ListItem>
                </div>
            )}
        />
    );
}
