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
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Pagination, PlaceholderTable, TableCard } from '~/components/ui';
import {
    generateActivityTableColumns,
    generateTransactionsTableColumns,
    getIotaBalanceChangeForAddress,
} from '~/lib/ui';
import { useEffect, useState } from 'react';
import { PAGE_SIZES_RANGE_10_50 } from '~/lib';
import { useCursorPagination } from '@iota/core';

const PAGE_RANGE = PAGE_SIZES_RANGE_10_50;

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

/**
 * Whether `txn` matches `direction` from `address`'s perspective. The node's `FromAddress` and
 * `ToAddress` filters aren't reliably supported by every RPC/indexer (they can silently return
 * no results), so direction is determined client-side from the already-fetched transaction data
 * instead of being pushed down as a query filter.
 */
function matchesDirection(
    txn: IotaTransactionBlockResponse,
    direction: TransactionDirection,
    address: string,
): boolean {
    if (direction === TransactionDirection.All) {
        return true;
    }
    const balanceChange = getIotaBalanceChangeForAddress(txn, address);
    const isReceived =
        balanceChange && balanceChange.amount !== '0'
            ? Number(balanceChange.amount) > 0
            : txn.transaction?.data.sender !== address;

    return direction === TransactionDirection.Sent ? !isReceived : isReceived;
}

interface QueryTransactionPageResult {
    data: IotaTransactionBlockResponse[];
    nextCursor: string | null;
    hasNextPage: boolean;
}

async function queryTransactionPage(
    client: IotaClient,
    address: string,
    direction: TransactionDirection,
    cursor: string | null,
    limit: number,
): Promise<QueryTransactionPageResult> {
    const page = await client.queryTransactionBlocks({
        filter: { FromOrToAddress: { addr: address } },
        order: 'descending',
        options: {
            showEffects: true,
            showInput: true,
            showBalanceChanges: true,
            showEvents: true,
        },
        cursor,
        limit,
    });
    return {
        data: page.data.filter((txn) => matchesDirection(txn, direction, address)),
        nextCursor: page.nextCursor ?? null,
        hasNextPage: page.hasNextPage,
    };
}

interface DirectionAvailability {
    hasSent: boolean;
    hasReceived: boolean;
}

// How many of `address`'s most recent transactions to sample when checking whether it has ever
// sent/received, since the node has no cheap way to check this (see `matchesDirection`).
const DIRECTION_AVAILABILITY_SAMPLE_SIZE = 50;

/**
 * Determines whether `address` has sent and/or received a transaction among its most recent
 * `DIRECTION_AVAILABILITY_SAMPLE_SIZE` transactions.
 */
async function getDirectionAvailability(
    client: IotaClient,
    address: string,
): Promise<DirectionAvailability> {
    const page = await client.queryTransactionBlocks({
        filter: { FromOrToAddress: { addr: address } },
        order: 'descending',
        options: { showInput: true },
        limit: DIRECTION_AVAILABILITY_SAMPLE_SIZE,
    });
    let hasSent = false;
    let hasReceived = false;
    for (const txn of page.data) {
        if (matchesDirection(txn, TransactionDirection.Sent, address)) {
            hasSent = true;
        } else {
            hasReceived = true;
        }
        if (hasSent && hasReceived) {
            break;
        }
    }
    return { hasSent, hasReceived };
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
    directionOptions: { label: string; value: TransactionDirection }[];
}

const PLACEHOLDER_COL_HEADINGS: Record<TransactionsForAddressView, string[]> = {
    activity: ['Type', 'Sender', 'Txns', 'Balance Change', 'With', 'Gas Fee', 'Time', 'Function'],
    'transaction-blocks': ['Type', 'Sender', 'Txns', 'Balance Change', 'Gas', 'Time', 'Function'],
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
    const client = useIotaClient();

    const directionAvailability = useQuery({
        queryKey: ['transactions-for-address-direction-availability', address, client],
        queryFn: () => getDirectionAvailability(client, address),
    });

    // Optimistically show a direction until we know for sure it has no transactions, to avoid
    // the button flashing in and out while the availability query is still in flight.
    const directionOptions = DIRECTION_OPTIONS.filter((option) => {
        if (option.value === TransactionDirection.Received) {
            return directionAvailability.data?.hasReceived ?? true;
        }
        if (option.value === TransactionDirection.Sent) {
            return directionAvailability.data?.hasSent ?? true;
        }
        return true;
    });

    useEffect(() => {
        if (!directionOptions.some((option) => option.value === direction)) {
            setDirection(TransactionDirection.All);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [directionOptions]);

    const transactions = useInfiniteQuery({
        queryKey: ['transactions-for-address', address, limit, direction, client],
        queryFn: ({ pageParam: cursor }) =>
            queryTransactionPage(client, address, direction, cursor, limit),
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
            directionOptions={directionOptions}
        />
    );
}
