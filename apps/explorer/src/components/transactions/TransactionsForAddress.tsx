// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    DropdownPosition,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    Placeholder,
    Select,
    SelectSize,
} from '@iota/apps-ui-kit';
import { useIotaClient } from '@iota/dapp-kit';
import { Warning } from '@iota/apps-ui-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PlaceholderTable, TableCard } from '~/components/ui';
import { generateActivityTableColumns, generateTransactionsTableColumns } from '~/lib/ui';
import { useState } from 'react';
import { PAGE_SIZES_RANGE_10_50 } from '~/lib';
import { useCursorPagination } from '@iota/core';

const PAGE_RANGE = PAGE_SIZES_RANGE_10_50;

type TransactionsForAddressView = 'activity' | 'transaction-blocks';

interface TransactionsForAddressProps {
    address: string;
    view: TransactionsForAddressView;
}

const PLACEHOLDER_COL_HEADINGS: Record<TransactionsForAddressView, string[]> = {
    activity: ['Type', 'Sender', 'Txns', 'Balance Change', 'With', 'Gas Fee', 'Time', 'Function'],
    'transaction-blocks': ['Type', 'Sender', 'Txns', 'Balance Change', 'Gas', 'Time', 'Function'],
};

export function TransactionsForAddress({
    address,
    view,
}: TransactionsForAddressProps): JSX.Element {
    // The cursor page number is local hook state. Re-mount it for a new address so a page from
    // the previous address cannot point past the new query's first page.
    return <TransactionsForAddressContent key={address} address={address} view={view} />;
}

function TransactionsForAddressContent({
    address,
    view,
}: TransactionsForAddressProps): JSX.Element {
    const [limit, setLimit] = useState(PAGE_RANGE[0]);
    const client = useIotaClient();

    const transactions = useInfiniteQuery({
        queryKey: ['transactions-for-address', address, limit, client],
        queryFn: ({ pageParam: cursor }) =>
            client.queryTransactionBlocks({
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
            }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) =>
            lastPage.hasNextPage ? (lastPage.nextCursor ?? null) : null,
    });

    const { data, isFetching, isError, pagination } = useCursorPagination(transactions);

    if (isFetching) {
        return (
            <div className="flex flex-col gap-y-6">
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
            <InfoBox
                title="Failed to extract transactions"
                supportingText={`Transactions could not be extracted on the following specified address: ${address}`}
                icon={<Warning />}
                type={InfoBoxType.Error}
                style={InfoBoxStyle.Elevated}
            />
        );
    }

    const tableColumns =
        view === 'activity'
            ? generateActivityTableColumns(address)
            : generateTransactionsTableColumns(address);
    const hasTxns = (data?.data.length ?? 0) > 0;

    if (!hasTxns) {
        return (
            <div className="flex h-20 items-center justify-center md:h-full">
                <span className="flex flex-row items-center gap-x-xs text-iota-neutral-40 dark:text-iota-neutral-60">
                    No transactions found
                </span>
            </div>
        );
    }

    return (
        <TableCard
            data={data?.data ?? []}
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
                        pagination.onFirst();
                    }}
                />
            }
        />
    );
}
