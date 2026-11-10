// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type JSX, useEffect, useMemo, useRef, useState } from 'react';
import {
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    LoadingIndicator,
    Panel,
    Title,
} from '@iota/apps-ui-kit';
import { useOnScreen } from '@iota/core';
import {
    CoinFilters,
    type CoinFilter,
    ErrorBoundary,
    PageLayout,
    PlaceholderTable,
    TableCard,
    TableSearch,
} from '~/components';
import { generateCoinsTableColumns } from '~/lib/ui';
import { Info, Warning } from '@iota/apps-ui-icons';
import {
    COINS_PAGE_SIZE,
    useDebouncedValue,
    useGetCoin,
    useGetIndexedCoins,
    useGetRecognizedCoins,
} from '~/hooks';
import { getCoinPagePath, toCoinType } from '~/lib/utils';
import { type CoinsFilter as BackendCoinsFilter, type CoinsSort } from '@iota/apps-backend-client';
import type { SortingState } from '@tanstack/react-table';

const COLUMN_HEADINGS = ['Coin', 'Creator', 'Supply', 'Created'];
const COINS_FILTER: Record<CoinFilter, BackendCoinsFilter> = {
    All: 'all',
    Recognized: 'recognized',
    'Not Recognized': 'not-recognized',
};
const COINS_SORTS: CoinsSort[] = ['name', 'createdAt'];

function toCoinsSort(columnId: string): CoinsSort | undefined {
    return COINS_SORTS.find((sort) => sort === columnId);
}

function CoinsPageResult(): JSX.Element {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<CoinFilter>('All');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnSort] = sorting;
    const search = useDebouncedValue(searchTerm.trim());
    const loadMoreElem = useRef<HTMLDivElement | null>(null);
    const { isIntersecting } = useOnScreen(loadMoreElem);

    const {
        data,
        isPending,
        isError,
        isPlaceholderData,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    } = useGetIndexedCoins(
        COINS_FILTER[filter],
        search,
        columnSort && toCoinsSort(columnSort.id),
        columnSort?.desc ? 'desc' : 'asc',
    );
    const { data: recognizedCoins } = useGetRecognizedCoins();

    const firstPage = data?.pages[0];
    const isIndexing = firstPage?.status === 'indexing';
    const isNotIndexed = firstPage?.status === 'not-indexed';
    const coins = useMemo(
        () => data?.pages.flatMap((page) => (page.status === 'ready' ? page.coins : [])) ?? [],
        [data],
    );
    const counts = firstPage?.status === 'ready' ? firstPage.counts : undefined;
    const filterCounts = counts && {
        All: counts.all,
        Recognized: counts.recognized,
        'Not Recognized': counts['not-recognized'],
    };

    useEffect(() => {
        if (isIntersecting && hasNextPage && !isFetchingNextPage && !isPlaceholderData) {
            fetchNextPage();
        }
    }, [isIntersecting, hasNextPage, isFetchingNextPage, isPlaceholderData, fetchNextPage]);

    const tableColumns = useMemo(
        () => generateCoinsTableColumns({ recognizedCoins }),
        [recognizedCoins],
    );
    // Coins created after the last indexing are not in the index yet, so a coin
    // type search falls back to looking the coin up on chain.
    const searchedCoinType = toCoinType(search);
    const isCoinLookupNeeded =
        !!searchedCoinType &&
        filter === 'All' &&
        !!data &&
        !isPlaceholderData &&
        !isIndexing &&
        coins.length === 0;
    const { data: searchedCoin, isPending: isSearchedCoinPending } = useGetCoin(
        searchedCoinType ?? '',
        { enabled: isCoinLookupNeeded },
    );
    const isSearchedCoinLoading = isCoinLookupNeeded && isSearchedCoinPending;
    const displayedCoins = isCoinLookupNeeded && searchedCoin ? [searchedCoin] : coins;

    const isNoResults =
        !!data && !isIndexing && !isSearchedCoinLoading && displayedCoins.length === 0;
    const isSpinnerVisible = hasNextPage && isFetchingNextPage;

    return (
        <PageLayout
            content={
                <div className="flex w-full flex-col gap-xl">
                    <div className="pt-md--rs text-display-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                        Coins
                    </div>
                    <InfoBox
                        title="Anyone can create a coin"
                        supportingText="Names, symbols and icons can be copied. Check the coin type to make sure it's the coin you expect."
                        icon={<Info />}
                        type={InfoBoxType.Default}
                        style={InfoBoxStyle.Elevated}
                    />
                    <Panel>
                        <Title title="All Coins" />

                        {!isNotIndexed ? (
                            <>
                                <div className="flex flex-col gap-md p-md">
                                    <TableSearch
                                        onSearch={setSearchTerm}
                                        placeholder="Search by name, symbol or coin type…"
                                    />
                                    <div className="flex">
                                        <CoinFilters
                                            selectedFilter={filter}
                                            onFilterChange={setFilter}
                                            counts={filterCounts}
                                        />
                                    </div>
                                </div>
                                <div className="p-md">
                                    {isError ? (
                                        <InfoBox
                                            title="Failed to load data"
                                            supportingText="Coins data could not be loaded"
                                            icon={<Warning />}
                                            type={InfoBoxType.Error}
                                            style={InfoBoxStyle.Elevated}
                                        />
                                    ) : isNoResults ? (
                                        <InfoBox
                                            title="No coins found"
                                            supportingText={
                                                search
                                                    ? 'No coin matches your search. Try a valid name, symbol or coin type'
                                                    : undefined
                                            }
                                            icon={<Warning />}
                                            type={InfoBoxType.Warning}
                                            style={InfoBoxStyle.Elevated}
                                        />
                                    ) : (
                                        <ErrorBoundary>
                                            {isPending || isIndexing || isSearchedCoinLoading ? (
                                                <PlaceholderTable
                                                    rowCount={COINS_PAGE_SIZE}
                                                    rowHeight="16px"
                                                    colHeadings={COLUMN_HEADINGS}
                                                />
                                            ) : (
                                                <TableCard
                                                    sortTable
                                                    sorting={sorting}
                                                    onSortingChange={setSorting}
                                                    data={displayedCoins}
                                                    columns={tableColumns}
                                                    areHeadersCentered={false}
                                                    getRowHref={({ coinType }) =>
                                                        getCoinPagePath(coinType)
                                                    }
                                                />
                                            )}
                                        </ErrorBoundary>
                                    )}
                                    {isSpinnerVisible && (
                                        <div className="mt-1 flex w-full justify-center">
                                            <LoadingIndicator text="Loading data" />
                                        </div>
                                    )}
                                    <div ref={loadMoreElem} className="h-px" />
                                </div>
                            </>
                        ) : (
                            <div className="p-md">
                                <InfoBox
                                    title="Coin list not available"
                                    supportingText="The coin list is not available on this network."
                                    icon={<Info />}
                                    type={InfoBoxType.Default}
                                    style={InfoBoxStyle.Elevated}
                                />
                            </div>
                        )}
                    </Panel>
                </div>
            }
        />
    );
}

export { CoinsPageResult };
