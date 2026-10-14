// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type JSX, useCallback, useMemo, useRef, useState } from 'react';
import { InfoBox, InfoBoxStyle, InfoBoxType, Panel, Title } from '@iota/apps-ui-kit';
import { useCoinRegistry } from '@iota/core';
import { normalizeStructTag } from '@iota/iota-sdk/utils';
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
import { type OnChainCoin, useGetAllCoins } from '~/hooks';
import { getCoinPagePath, toCoinType } from '~/lib/utils';

const COLUMN_HEADINGS = ['Coin', 'Creator', 'Supply', 'Created'];
const COINS_BATCH_SIZE = 20;

function byCreationDate(coin1: OnChainCoin, coin2: OnChainCoin): number {
    return (
        (coin1.createdAt ?? Number.MAX_SAFE_INTEGER) - (coin2.createdAt ?? Number.MAX_SAFE_INTEGER)
    );
}

function CoinsPageResult(): JSX.Element {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<CoinFilter>('All');
    const [visibleCount, setVisibleCount] = useState(COINS_BATCH_SIZE);
    const trimmedSearchTerm = searchTerm.trim();
    const loadMoreObserverRef = useRef<IntersectionObserver | null>(null);

    const { data: allCoins, isPending, isError } = useGetAllCoins();
    const coinRegistry = useCoinRegistry();

    const { recognizedCoins, notRecognizedCoins } = useMemo(() => {
        if (!allCoins) return { recognizedCoins: [], notRecognizedCoins: [] };
        const coinsByType = new Map(allCoins.map((coin) => [coin.coinType, coin]));
        const recognized = coinRegistry.flatMap(({ coinType }) => {
            const coin = coinsByType.get(normalizeStructTag(coinType));
            return coin ? [coin] : [];
        });
        const recognizedTypes = new Set(recognized.map(({ coinType }) => coinType));
        return {
            recognizedCoins: recognized,
            notRecognizedCoins: allCoins
                .filter(({ coinType }) => !recognizedTypes.has(coinType))
                .sort(byCreationDate),
        };
    }, [allCoins, coinRegistry]);

    const filteredCoins = useMemo(() => {
        const coinsByFilter: Record<CoinFilter, OnChainCoin[]> = {
            All: [...recognizedCoins, ...notRecognizedCoins],
            Recognized: recognizedCoins,
            'Not Recognized': notRecognizedCoins,
        };
        const coins = coinsByFilter[filter];
        if (!trimmedSearchTerm) return coins;

        const searchedCoinType = toCoinType(trimmedSearchTerm);
        if (searchedCoinType) return coins.filter(({ coinType }) => coinType === searchedCoinType);

        const text = trimmedSearchTerm.toLowerCase();
        return coins.filter(({ coinType, name, symbol }) =>
            [coinType, name, symbol].some((value) => value.toLowerCase().includes(text)),
        );
    }, [trimmedSearchTerm, filter, notRecognizedCoins, recognizedCoins]);

    const hasMoreCoins = visibleCount < filteredCoins.length;

    const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
        loadMoreObserverRef.current?.disconnect();
        if (!node) return;
        loadMoreObserverRef.current = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setVisibleCount((count) => count + COINS_BATCH_SIZE);
        });
        loadMoreObserverRef.current.observe(node);
    }, []);

    const onSearchTermChange = useCallback((term: string) => {
        setSearchTerm(term);
        setVisibleCount(COINS_BATCH_SIZE);
    }, []);

    const handleFilterChange = useCallback((newFilter: CoinFilter) => {
        setFilter(newFilter);
        setVisibleCount(COINS_BATCH_SIZE);
    }, []);

    const filterCounts = useMemo(() => {
        if (!allCoins) return undefined;
        return {
            All: allCoins.length,
            Recognized: recognizedCoins.length,
            'Not Recognized': notRecognizedCoins.length,
        };
    }, [allCoins, notRecognizedCoins.length, recognizedCoins.length]);

    const tableColumns = useMemo(
        () => generateCoinsTableColumns({ recognizedCoins }),
        [recognizedCoins],
    );

    const isNoResults = !!allCoins && filteredCoins.length === 0;

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
                                onSearch={onSearchTermChange}
                                placeholder="Search by name, symbol or coin type…"
                            />
                            <div className="flex">
                                <CoinFilters
                                    selectedFilter={filter}
                                    onFilterChange={handleFilterChange}
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
                                        trimmedSearchTerm
                                            ? 'No coin matches your search. Try a valid name, symbol or coin type'
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
                                            sortTable
                                            data={filteredCoins}
                                            rowLimit={visibleCount}
                                            columns={tableColumns}
                                            areHeadersCentered={false}
                                            getRowHref={({ coinType }) => getCoinPagePath(coinType)}
                                        />
                                    )}
                                </ErrorBoundary>
                            )}
                            {!isPending && hasMoreCoins && (
                                <div key={visibleCount} ref={loadMoreRef} className="h-px" />
                            )}
                        </div>
                    </Panel>
                </div>
            }
        />
    );
}

export { CoinsPageResult };
