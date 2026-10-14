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
import { useCursorPagination } from '@iota/core';
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
import { useGetAllCoins, useGetCoinsCount, useGetRecognizedCoins } from '~/hooks';
import { PAGE_SIZES_RANGE_20_60 } from '~/lib/constants';
import { getCoinPagePath, toCoinType } from '~/lib/utils';

const COLUMN_HEADINGS = ['Coin', 'Creator', 'Supply', 'Created'];

function CoinsPageResult(): JSX.Element {
    const [limit, setLimit] = useState(PAGE_SIZES_RANGE_20_60[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<CoinFilter>('All');
    const searchedCoinType = useMemo(() => toCoinType(searchTerm.trim()), [searchTerm]);

    const { data, pagination, isError, isPending, isFetching } = useCursorPagination(
        useGetAllCoins(limit, searchedCoinType),
    );

    const onSearchTermChange = useCallback(
        (term: string) => {
            setSearchTerm(term);
            pagination.onFirst();
        },
        [pagination],
    );

    const isInvalidSearch = !!searchTerm.trim() && !searchedCoinType;

    const handleFilterChange = useCallback(
        (newFilter: CoinFilter) => {
            setFilter(newFilter);
            pagination.onFirst();
        },
        [pagination],
    );

    const {
        data: recognizedCoins = [],
        isPending: isRecognizedCoinsPending,
        isError: isRecognizedCoinsError,
    } = useGetRecognizedCoins();
    const { data: coinsCount } = useGetCoinsCount();

    const filterCounts = useMemo(() => {
        if (coinsCount === undefined || isRecognizedCoinsPending || isRecognizedCoinsError) {
            return undefined;
        }
        return {
            All: coinsCount,
            Recognized: recognizedCoins.length,
            'Not Recognized': coinsCount - recognizedCoins.length,
        };
    }, [coinsCount, isRecognizedCoinsPending, isRecognizedCoinsError, recognizedCoins.length]);

    const tableColumns = useMemo(
        () => generateCoinsTableColumns({ recognizedCoins }),
        [recognizedCoins],
    );

    const visibleCoins = useMemo(() => {
        if (isInvalidSearch) return [];

        if (filter === 'Recognized') {
            return searchedCoinType
                ? recognizedCoins.filter(({ coinType }) => coinType === searchedCoinType)
                : recognizedCoins;
        }

        if (!data) return [];
        const recognizedTypes = new Set(recognizedCoins.map(({ coinType }) => coinType));
        const notRecognizedCoins = data.coins.filter(
            ({ coinType }) => !recognizedTypes.has(coinType),
        );

        if (filter === 'Not Recognized') return notRecognizedCoins;
        if (searchedCoinType) return data.coins;

        // Recognized coins are pinned to the top of the first page so they are
        // never buried among the rest.
        return pagination.currentPage === 0
            ? [...recognizedCoins, ...notRecognizedCoins]
            : notRecognizedCoins;
    }, [data, filter, isInvalidSearch, pagination.currentPage, recognizedCoins, searchedCoinType]);

    const isRecognizedFilter = filter === 'Recognized';
    const isTableError = isRecognizedCoinsError || (!isRecognizedFilter && isError);
    const isTableLoading =
        isRecognizedCoinsPending || (!isRecognizedFilter && (isPending || isFetching || !data));

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
                                placeholder="Search by coin type…"
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
                            {isInvalidSearch && (
                                <InfoBox
                                    title="No coins found"
                                    supportingText="Try a different search term"
                                    icon={<Warning />}
                                    type={InfoBoxType.Warning}
                                    style={InfoBoxStyle.Elevated}
                                />
                            )}
                            {isTableError ? (
                                <InfoBox
                                    title="Failed to load data"
                                    supportingText="Coins data could not be loaded"
                                    icon={<Warning />}
                                    type={InfoBoxType.Error}
                                    style={InfoBoxStyle.Elevated}
                                />
                            ) : (
                                <ErrorBoundary>
                                    {isTableLoading ? (
                                        <PlaceholderTable
                                            rowCount={isRecognizedFilter ? 3 : limit}
                                            rowHeight="16px"
                                            colHeadings={COLUMN_HEADINGS}
                                        />
                                    ) : (
                                        <TableCard
                                            sortTable
                                            data={visibleCoins}
                                            columns={tableColumns}
                                            areHeadersCentered={false}
                                            defaultSorting={[{ id: 'createdAt', desc: false }]}
                                            getRowHref={({ coinType }) => getCoinPagePath(coinType)}
                                            paginationOptions={
                                                isRecognizedFilter ? undefined : pagination
                                            }
                                            pageSizeSelector={
                                                !isRecognizedFilter && (
                                                    <Select
                                                        value={limit.toString()}
                                                        options={PAGE_SIZES_RANGE_20_60.map(
                                                            (size) => ({
                                                                label: `${size} / page`,
                                                                id: size.toString(),
                                                            }),
                                                        )}
                                                        size={SelectSize.Small}
                                                        onValueChange={(value) => {
                                                            setLimit(Number(value));
                                                            pagination.onFirst();
                                                        }}
                                                    />
                                                )
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
