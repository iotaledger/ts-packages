// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type AuditTrailHandle, type Record, type Data } from '@iota/audit-trails/web';
import { usePaginatedAuditTrailRecords } from '~/hooks/useResolveAuditTrail';
import {
    Panel,
    Title,
    TableCellBase,
    TableCellText,
    Button,
    ButtonType,
    ButtonSize,
} from '@iota/apps-ui-kit';
import { TableCard, PlaceholderTable } from '~/components/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@iota/core';
import { useState } from 'react';
import { formatAddress } from '@iota/iota-sdk/utils';

type AuditTrailRecordsProps = {
    objectId: string;
    auditTrail: AuditTrailHandle;
};

const PAGE_SIZE = 15;

export function RecordsView({ objectId, auditTrail }: AuditTrailRecordsProps) {
    const { records, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
        usePaginatedAuditTrailRecords({
            objectId,
            auditTrail,
            pageSize: PAGE_SIZE,
        });

    return (
        <Panel>
            <div className="flex w-full flex-col justify-between gap-xxs p-md--rs sm:flex-row md:items-center">
                <Title title="Records" />
            </div>
            <div className="flex flex-col gap-sm p-md--rs">
                {isLoading || isFetchingNextPage ? (
                    <PlaceholderTable
                        rowCount={PAGE_SIZE}
                        rowHeight="16px"
                        colHeadings={[
                            'Sequence #',
                            'Tag',
                            'Data Preview',
                            'Added By',
                            'Added At',
                            'Status',
                        ]}
                    />
                ) : (
                    <RecordsTable records={records} />
                )}
                {hasNextPage && (
                    <div className="flex justify-center">
                        <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                            Load More
                        </Button>
                    </div>
                )}
            </div>
        </Panel>
    );
}

function RecordsTable({ records }: { records: Record[] }) {
    return <TableCard data={records} columns={generateRecordsTableColumns()} />;
}

function DataPreviewCell({ data }: { data: Data }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const dataString = data.toString();

    if (dataString.length <= 50) {
        return (
            <TableCellBase>
                <TableCellText>{dataString}</TableCellText>
            </TableCellBase>
        );
    }

    const preview = isExpanded ? dataString : `${dataString.slice(0, 50)}...`;

    return (
        <TableCellBase>
            <div className="group relative flex w-full flex-col">
                <TableCellText>
                    <div className="whitespace-pre-wrap break-all">{preview}</div>
                </TableCellText>
                <div className="invisible absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] group-hover:visible dark:bg-black/60">
                    <Button
                        type={ButtonType.Outlined}
                        size={ButtonSize.Small}
                        text={isExpanded ? 'Show less' : 'Show more'}
                        onClick={() => setIsExpanded(!isExpanded)}
                    />
                </div>
            </div>
        </TableCellBase>
    );
}

export function generateRecordsTableColumns(): ColumnDef<Record>[] {
    return [
        {
            accessorKey: 'sequenceNumber',
            header: 'Sequence #',
            cell: ({ getValue }) => (
                <TableCellBase>
                    <TableCellText>{getValue<bigint>().toString()}</TableCellText>
                </TableCellBase>
            ),
        },
        {
            accessorKey: 'tag',
            header: 'Tag',
            cell: ({ getValue }) => (
                <TableCellBase>
                    <TableCellText>{getValue<string>() || 'N/A'}</TableCellText>
                </TableCellBase>
            ),
        },
        {
            accessorKey: 'data',
            header: 'Data Preview',
            cell: ({ getValue }) => <DataPreviewCell data={getValue<Data>()} />,
        },
        {
            accessorKey: 'addedBy',
            header: 'Added By',
            cell: ({ getValue }) => (
                <TableCellBase>
                    <TableCellText>{formatAddress(getValue<string>())}</TableCellText>
                </TableCellBase>
            ),
        },
        {
            accessorKey: 'addedAt',
            header: 'Added At',
            cell: ({ getValue }) => (
                <TableCellBase>
                    <TableCellText>
                        {formatDate(Number(getValue<bigint>()), [
                            'year',
                            'month',
                            'day',
                            'hour',
                            'minute',
                        ])}
                    </TableCellText>
                </TableCellBase>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const isReplacedBy = row.original.correction?.isReplacedBy;
                const status =
                    isReplacedBy !== undefined ? `Replaced by ${isReplacedBy}` : 'Active';
                return (
                    <TableCellBase>
                        <TableCellText>{status}</TableCellText>
                    </TableCellBase>
                );
            },
        },
    ];
}
