// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type JSX, useMemo, useState, useCallback } from 'react';
import {
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    Panel,
    Select,
    SelectSize,
    Title,
} from '@iota/apps-ui-kit';
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
import { useDebouncedValue, useGetAllCoinsMetadata, useGetCoinsPublishInfo } from '~/hooks';
import { PAGE_SIZES_RANGE_20_60 } from '~/lib/constants';
import { getCoinPagePath, toCoinType } from '~/lib/utils';

const COLUMN_HEADINGS = ['Coin', 'Creator', 'Supply', 'Created'];
const SEARCH_DEBOUNCE_MS = 300;

function CoinsPageResult(): JSX.Element {
    const [limit, setLimit] = useState(PAGE_SIZES_RANGE_20_60[0]);
    const [page, setPage] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<CoinFilter>('All');
    const debouncedSearchTerm = useDebouncedValue(searchTerm.trim(), SEARCH_DEBOUNCE_MS);

    const { data: allCoins, isPending, isError } = useGetAllCoinsMetadata();
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
            notRecognizedCoins: allCoins.filter(({ coinType }) => !recognizedTypes.has(coinType)),
        };
    }, [allCoins, coinRegistry]);

    const filteredCoins = useMemo(() => {
        const coins =
            filter === 'Recognized'
                ? recognizedCoins
                : filter === 'Not Recognized'
                  ? notRecognizedCoins
                  : [...recognizedCoins, ...notRecognizedCoins];
        if (!debouncedSearchTerm) return coins;

        const searchedCoinType = toCoinType(debouncedSearchTerm);
        if (searchedCoinType) return coins.filter(({ coinType }) => coinType === searchedCoinType);

        const text = debouncedSearchTerm.toLowerCase();
        return coins.filter(
            ({ name, symbol }) =>
                name.toLowerCase().includes(text) || symbol.toLowerCase().includes(text),
        );
    }, [debouncedSearchTerm, filter, notRecognizedCoins, recognizedCoins]);

    const pageCoins = useMemo(
        () => filteredCoins.slice(page * limit, (page + 1) * limit),
        [filteredCoins, page, limit],
    );
    const {
        data: pageCoinsWithPublishInfo,
        isPending: isPublishInfoPending,
        isError: isPublishInfoError,
    } = useGetCoinsPublishInfo(pageCoins);

    const onSearchTermChange = useCallback((term: string) => {
        setSearchTerm(term);
        setPage(0);
    }, []);

    const handleFilterChange = useCallback((newFilter: CoinFilter) => {
        setFilter(newFilter);
        setPage(0);
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

    const lastPage = Math.max(Math.ceil(filteredCoins.length / limit) - 1, 0);
    const pagination = {
        onFirst: () => setPage(0),
        onPrev: () => setPage((current) => Math.max(current - 1, 0)),
        onNext: () => setPage((current) => Math.min(current + 1, lastPage)),
        onLast: () => setPage(lastPage),
        hasFirst: page > 0,
        hasPrev: page > 0,
        hasNext: page < lastPage,
        hasLast: page < lastPage,
    };

    const hasPageCoins = pageCoins.length > 0;
    const isTableError = isError || (hasPageCoins && isPublishInfoError);
    const isTableLoading =
        isPending || (hasPageCoins && (isPublishInfoPending || !pageCoinsWithPublishInfo));
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
                            {isTableError ? (
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
                                    supportingText="Try a different search term"
                                    icon={<Warning />}
                                    type={InfoBoxType.Warning}
                                    style={InfoBoxStyle.Elevated}
                                />
                            ) : (
                                <ErrorBoundary>
                                    {isTableLoading ? (
                                        <PlaceholderTable
                                            rowCount={limit}
                                            rowHeight="16px"
                                            colHeadings={COLUMN_HEADINGS}
                                        />
                                    ) : (
                                        <TableCard
                                            sortTable
                                            data={pageCoinsWithPublishInfo ?? []}
                                            columns={tableColumns}
                                            areHeadersCentered={false}
                                            getRowHref={({ coinType }) => getCoinPagePath(coinType)}
                                            paginationOptions={pagination}
                                            pageSizeSelector={
                                                <Select
                                                    value={limit.toString()}
                                                    options={PAGE_SIZES_RANGE_20_60.map((size) => ({
                                                        label: `${size} / page`,
                                                        id: size.toString(),
                                                    }))}
                                                    size={SelectSize.Small}
                                                    onValueChange={(value) => {
                                                        setLimit(Number(value));
                                                        setPage(0);
                                                    }}
                                                />
                                            }
                                        />
                                    )}
                                </ErrorBoundary>
                            )}
                        </div>
                    </Panel>
                </div>
            }
        />
    );
}

export { CoinsPageResult };
