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
import { type IotaTransactionBlockResponse, type TransactionFilter } from '@iota/iota-sdk/client';
import { Warning } from '@iota/apps-ui-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PlaceholderTable, TableCard } from '~/components/ui';
import { generateTransactionsTableColumns } from '~/lib/ui';
import { useState } from 'react';
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
    { label: 'Received', value: TransactionDirection.Received },
    { label: 'Sent', value: TransactionDirection.Sent },
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

interface TransactionsForAddressProps {
    address: string;
}

interface TransactionsForAddressTableProps {
    data: IotaTransactionBlockResponse[];
    isLoading: boolean;
    isError: boolean;
    address: string;
    limit: number;
    setLimit: (limit: number) => void;
    pagination: TablePaginationOptions;
    direction: TransactionDirection;
    setDirection: (direction: TransactionDirection) => void;
}

export function TransactionsForAddressTable({
    data,
    isLoading,
    isError,
    address,
    limit,
    setLimit,
    pagination,
    direction,
    setDirection,
}: TransactionsForAddressTableProps): JSX.Element {
    const directionTabs = (
        <div className="flex flex-row gap-xs">
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
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex flex-col gap-y-6">
                {directionTabs}
                <PlaceholderTable
                    rowCount={limit}
                    rowHeight="16px"
                    colHeadings={['Type', 'Sender', 'Txns', 'Gas', 'Time']}
                />
                <Placeholder width="w-full" height="h-5" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col gap-y-6">
                {directionTabs}
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

    const tableColumns = generateTransactionsTableColumns(address);
    const hasTxns = data?.length > 0;

    if (!hasTxns) {
        return (
            <div className="flex flex-col gap-y-6">
                {directionTabs}
                <div className="flex h-20 items-center justify-center md:h-full">
                    <span className="flex flex-row items-center gap-x-xs text-iota-neutral-40 dark:text-iota-neutral-60">
                        No transactions found
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-y-6">
            {directionTabs}
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

export function TransactionsForAddress({ address }: TransactionsForAddressProps): JSX.Element {
    const [limit, setLimit] = useState(PAGE_RANGE[0]);
    const [direction, setDirection] = useState<TransactionDirection>(TransactionDirection.All);
    const client = useIotaClient();

    const transactions = useInfiniteQuery({
        queryKey: ['transactions-for-address', address, limit, direction],
        queryFn: ({ pageParam: cursor }) =>
            client.queryTransactionBlocks({
                filter: getTransactionFilterForDirection(direction, address),
                order: 'descending',
                options: {
                    showEffects: true,
                    showInput: true,
                    showBalanceChanges: true,
                    showEvents: true,
                },
                cursor,
                limit,
            }),
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
            limit={limit}
            setLimit={setLimit}
            pagination={pagination}
            direction={direction}
            setDirection={(newDirection) => {
                setDirection(newDirection);
                pagination.onFirst?.();
            }}
        />
    );
}
