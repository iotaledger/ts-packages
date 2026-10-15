// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type JSX, useEffect, useMemo, useRef, useState } from 'react';
import { InfoBox, InfoBoxStyle, InfoBoxType, Panel, Title } from '@iota/apps-ui-kit';
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
    INDEXED_COIN_NETWORKS,
    type OnChainCoin,
    useDebouncedValue,
    useGetAllCoins,
    useGetCoinsFromChain,
    useGetRecognizedCoins,
} from '~/hooks';
import { getCoinPagePath, toCoinType } from '~/lib/utils';
import { useNetworkContext } from '~/contexts';
import {
    type CoinsFilter as CoinFilterResponseType,
    type CoinsSort,
} from '@iota/apps-backend-client';
import type { SortingState } from '@tanstack/react-table';

const COLUMN_HEADINGS = ['Coin', 'Creator', 'Supply', 'Created'];
const COINS_BATCH_SIZE = 20;
const COINS_FILTER: Record<CoinFilter, CoinFilterResponseType> = {
    All: 'all',
    Recognized: 'recognized',
    'Not Recognized': 'not-recognized',
};
const COINS_SORT_BY_COLUMN: Record<string, CoinsSort> = {
    name: 'name',
    createdAt: 'createdAt',
};

function CoinsPageResult(): JSX.Element {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<CoinFilter>('All');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnSort] = sorting;
    const search = useDebouncedValue(searchTerm.trim());
    const loadMoreElem = useRef<HTMLDivElement | null>(null);
    const { isIntersecting } = useOnScreen(loadMoreElem);

    const [network] = useNetworkContext();
    const isIndexedNetwork = INDEXED_COIN_NETWORKS.includes(network);

    const backendCoins = useGetAllCoins(
        COINS_FILTER[filter],
        search,
        columnSort ? COINS_SORT_BY_COLUMN[columnSort.id] : undefined,
        columnSort?.desc ? 'desc' : 'asc',
        { enabled: isIndexedNetwork },
    );
    // Networks apps-backend does not index, and any backend failure, fall back to
    // listing the coins from GraphQL, which can only search by coin type.
    const isFallback = !isIndexedNetwork || backendCoins.isError;
    const searchedCoinType = toCoinType(search);
    const isInvalidFallbackSearch = isFallback && !!search && !searchedCoinType;
    const chainCoins = useGetCoinsFromChain(COINS_BATCH_SIZE, searchedCoinType, {
        enabled: isFallback && !isInvalidFallbackSearch,
    });
    const { isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = isFallback
        ? chainCoins
        : backendCoins;
    const { data: recognizedCoins } = useGetRecognizedCoins();

    const coinPages: { coins: OnChainCoin[] }[] | undefined = isFallback
        ? chainCoins.data?.pages
        : backendCoins.data?.pages;
    const coins = useMemo(() => coinPages?.flatMap((page) => page.coins) ?? [], [coinPages]);
    const counts = isFallback ? undefined : backendCoins.data?.pages[0]?.counts;
    const filterCounts = counts && {
        All: counts.all,
        Recognized: counts.recognized,
        'Not Recognized': counts['not-recognized'],
    };

    useEffect(() => {
        if (isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const tableColumns = useMemo(
        () => generateCoinsTableColumns({ recognizedCoins }),
        [recognizedCoins],
    );
    const isNoResults = isInvalidFallbackSearch || (!!coinPages && coins.length === 0);

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

                        <div className="flex flex-col gap-md p-md">
                            <TableSearch
                                onSearch={setSearchTerm}
                                placeholder={
                                    isFallback
                                        ? 'Search by coin type…'
                                        : 'Search by name, symbol or coin type…'
                                }
                            />
                            {!isFallback && (
                                <div className="flex">
                                    <CoinFilters
                                        selectedFilter={filter}
                                        onFilterChange={setFilter}
                                        counts={filterCounts}
                                    />
                                </div>
                            )}
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
                                            ? isFallback
                                                ? 'No coin matches your search. Try a valid coin type'
                                                : 'No coin matches your search. Try a valid name, symbol or coin type'
                                            : undefined
                                    }
                                    icon={<Warning />}
                                    type={InfoBoxType.Warning}
                                    style={InfoBoxStyle.Elevated}
                                />
                            ) : (
                                <ErrorBoundary>
                                    {isPending ? (
                                        <PlaceholderTable
                                            rowCount={COINS_BATCH_SIZE}
                                            rowHeight="16px"
                                            colHeadings={COLUMN_HEADINGS}
                                        />
                                    ) : (
                                        <TableCard
                                            sortTable={!isFallback}
                                            allowManualTableSort={!isFallback}
                                            sorting={sorting}
                                            onSortingChange={setSorting}
                                            data={coins}
                                            columns={tableColumns}
                                            areHeadersCentered={false}
                                            getRowHref={({ coinType }) => getCoinPagePath(coinType)}
                                        />
                                    )}
                                </ErrorBoundary>
                            )}
                            <div ref={loadMoreElem} className="h-px" />
                        </div>
                    </Panel>
                </div>
            }
        />
    );
}

export { CoinsPageResult };
