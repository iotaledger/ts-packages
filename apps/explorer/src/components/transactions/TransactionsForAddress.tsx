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
    Toggle,
    type TablePaginationOptions,
} from '@iota/apps-ui-kit';
import { useIotaClient } from '@iota/dapp-kit';
import {
    type IotaClient,
    type IotaTransactionBlockResponse,
    type TransactionFilter,
} from '@iota/iota-sdk/client';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { Warning } from '@iota/apps-ui-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Pagination, PlaceholderTable, TableCard } from '~/components/ui';
import {
    generateActivityTableColumns,
    generateTransactionsTableColumns,
    isProgrammableTransaction,
} from '~/lib/ui';
import { useState } from 'react';
import { PAGE_SIZES_RANGE_10_50 } from '~/lib';
import { useCursorPagination } from '@iota/core';

const PAGE_RANGE = PAGE_SIZES_RANGE_10_50;

// The node's maximum page size for `queryTransactionBlocks` (QUERY_MAX_RESULT_LIMIT). Fetching
// at this size while filtering out system transactions client-side minimizes RPC round-trips.
const QUERY_MAX_RESULT_LIMIT = 50;

// Cap on the number of RPC calls `queryFilteredTransactionPage` will make while filtering out
// system transactions client-side. Prevents scanning the entire chain for busy system addresses
// such as `0x0` (worst case ~100 scanned transactions per display page); a partial page with
// `hasNextPage: true` is acceptable, "Next" simply continues from the returned cursor.
const MAX_FETCH_ITERATIONS = 2;

// All system transactions are signed by the zero address.
const ZERO_ADDRESS = normalizeIotaAddress('0x0');

enum TransactionDirection {
    All = 'all',
    Received = 'received',
    Sent = 'sent',
}

const DIRECTION_OPTIONS: { label: string; value: TransactionDirection }[] = [
    { label: 'All', value: TransactionDirection.All },
    { label: 'Receive', value: TransactionDirection.Received },
    { label: 'Send', value: TransactionDirection.Sent },
];

function getTransactionFilterForDirection(
    direction: TransactionDirection,
    address: string,
): TransactionFilter {
    switch (direction) {
        case TransactionDirection.Received:
            return { ToAddress: address };
        case TransactionDirection.Sent:
            return { FromAddress: address };
        case TransactionDirection.All:
        default:
            return { FromOrToAddress: { addr: address } };
    }
}

/**
 * Whether a query with `filter` can return system transactions at all. System transactions are
 * signed by the zero address, so a `FromAddress` filter on any other address cannot match them.
 */
function canFilterMatchSystemTransactions(filter: TransactionFilter): boolean {
    return !('FromAddress' in filter && normalizeIotaAddress(filter.FromAddress) !== ZERO_ADDRESS);
}

interface QueryFilteredTransactionPageResult {
    data: IotaTransactionBlockResponse[];
    nextCursor: string | null;
    hasNextPage: boolean;
}

/**
 * Query a page of transaction blocks for `filter`, optionally filtering out system transactions
 * (`hideSystemTxs`). The RPC has no server-side way to combine a kind filter with an address
 * filter, so when `hideSystemTxs` is true (and `filter` can actually match system transactions)
 * this fetches (and discards non-programmable transactions from) successive
 * `QUERY_MAX_RESULT_LIMIT`-sized pages until either `limit` programmable transactions have been
 * collected or `MAX_FETCH_ITERATIONS` RPC calls have been made.
 */
async function queryFilteredTransactionPage(
    client: IotaClient,
    filter: TransactionFilter,
    cursor: string | null,
    limit: number,
    hideSystemTxs: boolean,
): Promise<QueryFilteredTransactionPageResult> {
    const options = {
        showEffects: true,
        showInput: true,
        showBalanceChanges: true,
        showEvents: true,
    };

    if (!hideSystemTxs || !canFilterMatchSystemTransactions(filter)) {
        const page = await client.queryTransactionBlocks({
            filter,
            order: 'descending',
            options,
            cursor,
            limit,
        });
        return {
            data: page.data,
            nextCursor: page.nextCursor ?? null,
            hasNextPage: page.hasNextPage,
        };
    }

    const data: IotaTransactionBlockResponse[] = [];
    let nextCursor = cursor;
    let hasNextPage = true;

    for (
        let iteration = 0;
        iteration < MAX_FETCH_ITERATIONS && data.length < limit && hasNextPage;
        iteration++
    ) {
        const page = await client.queryTransactionBlocks({
            filter,
            order: 'descending',
            options,
            cursor: nextCursor,
            limit: QUERY_MAX_RESULT_LIMIT,
        });
        data.push(...page.data.filter(isProgrammableTransaction));
        nextCursor = page.nextCursor ?? null;
        hasNextPage = page.hasNextPage;
    }

    if (data.length > limit) {
        // The last RPC page overshot the display page. The RPC cursor is a transaction digest,
        // so continue from the last transaction actually included in the page to avoid skipping
        // the filtered transactions cut off by the slice.
        return {
            data: data.slice(0, limit),
            nextCursor: data[limit - 1].digest,
            hasNextPage: true,
        };
    }

    return {
        data,
        nextCursor,
        hasNextPage,
    };
}

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
    hideSystemTxs: boolean;
    setHideSystemTxs: (hideSystemTxs: boolean) => void;
}

const PLACEHOLDER_COL_HEADINGS: Record<TransactionsForAddressView, string[]> = {
    activity: ['Type', 'Balance Change', 'With', 'Gas Fee', 'Time'],
    'transaction-blocks': ['Type', 'Sender', 'Txns', 'Balance Change', 'Gas', 'Time'],
};

export function TransactionsForAddressTable({
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
    hideSystemTxs,
    setHideSystemTxs,
}: TransactionsForAddressTableProps): JSX.Element {
    const controls = (
        <div className="flex flex-row flex-wrap items-center gap-md">
            <SegmentedButton type={SegmentedButtonType.Outlined} shape={ButtonSegmentType.Rounded}>
                {DIRECTION_OPTIONS.map((option) => (
                    <ButtonSegment
                        key={option.value}
                        type={ButtonSegmentType.Rounded}
                        label={option.label}
                        selected={option.value === direction}
                        onClick={() => setDirection(option.value)}
                    />
                ))}
            </SegmentedButton>
            <Toggle
                label="Hide system transactions"
                isToggled={hideSystemTxs}
                onChange={(isToggled) => setHideSystemTxs(isToggled)}
                name="hide-system-transactions"
            />
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
        // the history (e.g. a page of only system transactions with "Hide system transactions"
        // checked), so keep the pagination controls visible when other pages exist.
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
                            pagination.onFirst?.();
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
    const [limit, setLimit] = useState(PAGE_RANGE[0]);
    const [direction, setDirection] = useState<TransactionDirection>(TransactionDirection.All);
    const [hideSystemTxs, setHideSystemTxs] = useState(view === 'activity');
    const client = useIotaClient();

    const transactions = useInfiniteQuery({
        queryKey: ['transactions-for-address', address, limit, direction, hideSystemTxs, client],
        queryFn: ({ pageParam: cursor }) =>
            queryFilteredTransactionPage(
                client,
                getTransactionFilterForDirection(direction, address),
                cursor,
                limit,
                hideSystemTxs,
            ),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) =>
            lastPage.hasNextPage ? (lastPage.nextCursor ?? null) : null,
    });

    const { data, isFetching, isError, pagination } = useCursorPagination(transactions);

    return (
        <TransactionsForAddressTable
            data={data?.data ?? []}
            isLoading={isFetching}
            isError={isError}
            address={address}
            view={view}
            limit={limit}
            setLimit={setLimit}
            pagination={pagination}
            direction={direction}
            setDirection={(newDirection) => {
                setDirection(newDirection);
                pagination.onFirst?.();
            }}
            hideSystemTxs={hideSystemTxs}
            setHideSystemTxs={(newHideSystemTxs) => {
                setHideSystemTxs(newHideSystemTxs);
                pagination.onFirst?.();
            }}
        />
    );
}
