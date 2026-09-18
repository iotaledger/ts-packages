// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Table,
    TableBody,
    TableHeader,
    TableHeaderCell,
    TableRow,
    TableActionButton,
    Tooltip,
    type TablePaginationOptions,
    TableHeaderCellSortOrder,
} from '@iota/apps-ui-kit';
import { Info } from '@iota/apps-ui-icons';
import {
    type ColumnDef,
    type RowData,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { Fragment, type ReactNode, useState } from 'react';
import { Link } from './Link';

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        /** Tooltip text shown next to the column header, via an info icon. */
        tooltip?: string;
    }
}

export interface TableCardProps<DataType extends RowData> {
    refetching?: boolean;
    data: DataType[];
    columns: ColumnDef<DataType>[];
    sortTable?: boolean;
    defaultSorting?: SortingState;
    areHeadersCentered?: boolean;
    paginationOptions?: TablePaginationOptions;
    totalLabel?: string;
    viewAll?: string;
    pageSizeSelector?: ReactNode;
    heightFull?: boolean;
    rowLimit?: number;
    allowManualTableSort?: boolean;
}

export function TableCard<DataType extends object>({
    refetching,
    data,
    columns,
    sortTable,
    defaultSorting,
    areHeadersCentered,
    paginationOptions,
    totalLabel,
    viewAll,
    pageSizeSelector,
    heightFull,
    rowLimit,
    allowManualTableSort = true,
}: TableCardProps<DataType>): JSX.Element {
    const [sorting, setSorting] = useState<SortingState>(defaultSorting || []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        enableSorting: !!sortTable,
        enableSortingRemoval: false,
        initialState: {
            sorting,
        },
        state: {
            sorting,
        },
    });

    function getColumnSortOrder(columnId: string, sortEnabled?: boolean) {
        const sortState = sorting.find((sort) => sort.id === columnId);
        if (!sortEnabled || !sortState) {
            return undefined;
        }

        if (sortState) {
            return sortState.desc ? TableHeaderCellSortOrder.Desc : TableHeaderCellSortOrder.Asc;
        }
    }

    return (
        <div
            className={clsx(
                'w-full overflow-visible',
                refetching && 'opacity-50',
                heightFull && 'h-full',
            )}
        >
            <Table
                heightFull
                rowIndexes={table.getRowModel().rows.map((row) => row.index)}
                paginationOptions={paginationOptions}
                supportingLabel={totalLabel}
                action={
                    viewAll ? (
                        <Link to={viewAll}>
                            <TableActionButton text="View All" />
                        </Link>
                    ) : undefined
                }
                pageSizeSelector={pageSizeSelector}
            >
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map(({ id, column }) => (
                                <TableHeaderCell
                                    key={id}
                                    columnKey={id}
                                    label={column.columnDef.header?.toString()}
                                    hasSort={allowManualTableSort && column.columnDef.enableSorting}
                                    sortOrder={getColumnSortOrder(
                                        id,
                                        column.columnDef.enableSorting,
                                    )}
                                    onSortClick={(key, sortOrder) => {
                                        setSorting([
                                            {
                                                id: String(key),
                                                desc: sortOrder === TableHeaderCellSortOrder.Desc,
                                            },
                                        ]);
                                        column.columnDef.enableSorting
                                            ? column.getToggleSortingHandler()
                                            : undefined;
                                    }}
                                    isContentCentered={areHeadersCentered}
                                    actionRight={
                                        column.columnDef.meta?.tooltip ? (
                                            <Tooltip text={column.columnDef.meta.tooltip}>
                                                <Info className="h-3.5 w-3.5 text-iota-neutral-40 dark:text-iota-neutral-60" />
                                            </Tooltip>
                                        ) : undefined
                                    }
                                />
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table
                        .getRowModel()
                        .rows.slice(0, rowLimit)
                        .map((row) => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <Fragment key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </Fragment>
                                ))}
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </div>
    );
}
