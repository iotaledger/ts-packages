// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    ButtonSegment,
    ButtonSegmentType,
    DropdownPosition,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    Placeholder,
    SegmentedButton,
    SegmentedButtonType,
    Select,
    SelectSize,
    type TablePaginationOptions,
} from '@iota/apps-ui-kit';
import { useIotaClient } from '@iota/dapp-kit';
import { type IotaClient, type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { Warning } from '@iota/apps-ui-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Pagination, PlaceholderTable, TableCard } from '~/components/ui';
import { generateActivityTableColumns, generateTransactionsTableColumns } from '~/lib/ui';
import { useEffect, useState } from 'react';
import { PAGE_SIZES_RANGE_10_50 } from '~/lib';
import { useCursorPagination } from '@iota/core';
import {
    queryAddressTransactionsPage,
    TransactionDirection,
    type AddressTransactionPageParam,
} from './addressTransactionFilters';

const PAGE_RANGE = PAGE_SIZES_RANGE_10_50;
const INITIAL_PAGE_PARAM: AddressTransactionPageParam = {
    cursor: null,
    buffered: [],
    rawHistoryExhausted: false,
};

const DIRECTION_OPTIONS: { label: string; value: TransactionDirection }[] = [
    { label: 'All', value: TransactionDirection.All },
    { label: 'Receive', value: TransactionDirection.Received },
    { label: 'Send', value: TransactionDirection.Sent },
];

type TransactionsForAddressView = 'activity' | 'transaction-blocks';

interface TransactionsForAddressProps {
    address: string;
    view: TransactionsForAddressView;
}

interface TransactionsForAddressTableProps {
    data: IotaTransactionBlockResponse[];
    isLoading: boolean;
    isError: boolean;
    address: string;
    view: TransactionsForAddressView;
    limit: number;
    setLimit: (limit: number) => void;
    pagination: TablePaginationOptions;
    direction: TransactionDirection;
    setDirection: (direction: TransactionDirection) => void;
    directionOptions: { label: string; value: TransactionDirection; disabled: boolean }[];
}

const PLACEHOLDER_COL_HEADINGS: Record<TransactionsForAddressView, string[]> = {
    activity: ['Type', 'Sender', 'Txns', 'Balance Change', 'With', 'Gas Fee', 'Time', 'Function'],
    'transaction-blocks': ['Type', 'Sender', 'Txns', 'Balance Change', 'Gas', 'Time', 'Function'],
};

function TransactionsForAddressTable({
    data,
    isLoading,
    isError,
    address,
    view,
    limit,
    setLimit,
    pagination,
    direction,
    setDirection,
    directionOptions,
}: TransactionsForAddressTableProps): JSX.Element {
    const controls = (
        <div className="flex flex-row flex-wrap items-center justify-between gap-md">
            <SegmentedButton type={SegmentedButtonType.Outlined} shape={ButtonSegmentType.Rounded}>
                {directionOptions.map((option) => (
                    <ButtonSegment
                        key={option.value}
                        type={ButtonSegmentType.Rounded}
                        label={option.label}
                        selected={option.value === direction}
                        disabled={option.disabled}
                        onClick={() => setDirection(option.value)}
                    />
                ))}
            </SegmentedButton>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex flex-col gap-y-6">
                {controls}
                <PlaceholderTable
                    rowCount={limit}
                    rowHeight="16px"
                    colHeadings={PLACEHOLDER_COL_HEADINGS[view]}
                />
                <Placeholder width="w-full" height="h-5" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col gap-y-6">
                {controls}
                <InfoBox
                    title="Failed to extract transactions"
                    supportingText={`Transactions could not be extracted on the following specified address: ${address}`}
                    icon={<Warning />}
                    type={InfoBoxType.Error}
                    style={InfoBoxStyle.Elevated}
                />
            </div>
        );
    }

    const tableColumns =
        view === 'activity'
            ? generateActivityTableColumns(address)
            : generateTransactionsTableColumns(address);
    const hasTxns = data?.length > 0;

    if (!hasTxns) {
        // Even with no rows to show, the user may be on an empty filtered page in the middle of
        // the history, so keep the pagination controls visible when other pages exist.
        const hasOtherPages = Boolean(
            pagination.hasNext || pagination.hasPrev || pagination.hasFirst,
        );
        return (
            <div className="flex flex-col gap-y-6">
                {controls}
                <div className="flex h-20 items-center justify-center md:h-full">
                    <span className="flex flex-row items-center gap-x-xs text-iota-neutral-40 dark:text-iota-neutral-60">
                        {hasOtherPages
                            ? 'No matching transactions on this page'
                            : 'No transactions found'}
                    </span>
                </div>
                {hasOtherPages && (
                    <Pagination
                        hasFirst={pagination.hasFirst ?? false}
                        hasPrev={pagination.hasPrev ?? false}
                        hasNext={pagination.hasNext ?? false}
                        onFirst={() => pagination.onFirst?.()}
                        onPrev={() => pagination.onPrev?.()}
                        onNext={() => pagination.onNext?.()}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-y-6">
            {controls}
            <TableCard
                data={data}
                columns={tableColumns}
                paginationOptions={pagination}
                pageSizeSelector={
                    <Select
                        value={limit.toString()}
                        options={PAGE_RANGE.map((size) => ({
                            label: `${size} / page`,
                            id: size.toString(),
                        }))}
                        size={SelectSize.Small}
                        dropdownPosition={DropdownPosition.Top}
                        onValueChange={(e) => {
                            setLimit(Number(e));
                        }}
                    />
                }
            />
        </div>
    );
}

export function TransactionsForAddress({
    address,
    view,
}: TransactionsForAddressProps): JSX.Element {
    // The cursor page number is local hook state. Re-mount it for a new address so a page from
    // the previous address cannot point past the new query's first page.
    return <TransactionsForAddressContent key={address} address={address} view={view} />;
}

function useAddressTransactionsQuery(
    client: IotaClient,
    address: string,
    direction: TransactionDirection,
    limit: number,
    enabled: boolean,
) {
    return useInfiniteQuery({
        queryKey: ['transactions-for-address', address, direction, limit, client],
        queryFn: ({ pageParam }) =>
            queryAddressTransactionsPage(client, address, direction, pageParam, limit),
        initialPageParam: INITIAL_PAGE_PARAM,
        getNextPageParam: (lastPage) => lastPage.nextPageParam,
        enabled,
    });
}

type AddressTransactionsQuery = ReturnType<typeof useAddressTransactionsQuery>;

function isDirectionProvenEmpty(query: AddressTransactionsQuery): boolean {
    return (
        query.isSuccess &&
        !query.hasNextPage &&
        (query.data?.pages ?? []).every((page) => page.data.length === 0)
    );
}

function TransactionsForAddressContent({
    address,
    view,
}: TransactionsForAddressProps): JSX.Element {
    const [limit, setLimit] = useState(PAGE_RANGE[0]);
    const [direction, setDirection] = useState<TransactionDirection>(TransactionDirection.All);
    const client = useIotaClient();

    // FromAddress and ToAddress retain only a limited SQL history. Every filter is built from the
    // full-history FromOrToAddress query instead. Only the selected direction fetches; the other
    // two stay idle so an address page costs a single query chain until a filter is used.
    const allTransactions = useAddressTransactionsQuery(
        client,
        address,
        TransactionDirection.All,
        limit,
        direction === TransactionDirection.All,
    );
    const receivedTransactions = useAddressTransactionsQuery(
        client,
        address,
        TransactionDirection.Received,
        limit,
        direction === TransactionDirection.Received,
    );
    const sentTransactions = useAddressTransactionsQuery(
        client,
        address,
        TransactionDirection.Sent,
        limit,
        direction === TransactionDirection.Sent,
    );

    const allPagination = useCursorPagination(allTransactions);
    const receivedPagination = useCursorPagination(receivedTransactions);
    const sentPagination = useCursorPagination(sentTransactions);
    const transactionsByDirection = {
        [TransactionDirection.All]: allPagination,
        [TransactionDirection.Received]: receivedPagination,
        [TransactionDirection.Sent]: sentPagination,
    };
    const queriesByDirection = {
        [TransactionDirection.All]: allTransactions,
        [TransactionDirection.Received]: receivedTransactions,
        [TransactionDirection.Sent]: sentTransactions,
    };
    const selectedTransactions = transactionsByDirection[direction];
    const isSelectedDirectionUnavailable = isDirectionProvenEmpty(queriesByDirection[direction]);
    const directionOptions = DIRECTION_OPTIONS.map((option) => ({
        ...option,
        disabled: isDirectionProvenEmpty(queriesByDirection[option.value]),
    }));

    useEffect(() => {
        if (isSelectedDirectionUnavailable && direction !== TransactionDirection.All) {
            setDirection(TransactionDirection.All);
        }
    }, [direction, isSelectedDirectionUnavailable]);

    const setPageSize = (newLimit: number) => {
        allPagination.pagination.onFirst();
        receivedPagination.pagination.onFirst();
        sentPagination.pagination.onFirst();
        setLimit(newLimit);
    };

    return (
        <TransactionsForAddressTable
            data={selectedTransactions.data?.data ?? []}
            isLoading={selectedTransactions.isFetching}
            isError={selectedTransactions.isError}
            address={address}
            view={view}
            limit={limit}
            setLimit={setPageSize}
            pagination={selectedTransactions.pagination}
            direction={direction}
            setDirection={setDirection}
            directionOptions={directionOptions}
        />
    );
}
