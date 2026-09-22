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
    ButtonUnstyled,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
} from '@iota/apps-ui-kit';
import { Info, Warning } from '@iota/apps-ui-icons';
import { TableCard, PlaceholderTable } from '~/components/ui';
import { DateDisplay } from '~/components';
import { type ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import clsx from 'clsx';
import { formatAddress, toHex } from '@iota/iota-sdk/utils';

type AuditTrailRecordsProps = {
    objectId: string;
    auditTrail: AuditTrailHandle;
};

const PAGE_SIZE = 15;
const PREVIEW_LENGTH = 50;

export function RecordsView({ objectId, auditTrail }: AuditTrailRecordsProps) {
    const { records, error, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
        usePaginatedAuditTrailRecords({
            objectId,
            auditTrail,
            pageSize: PAGE_SIZE,
        });

    return (
        <Panel>
            <Title title="Records" />

            <div className="flex flex-col gap-sm p-md--rs">
                {isLoading ? (
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
                    <RecordsContent records={records} error={error} />
                )}
                {hasNextPage && (
                    <div className="flex justify-center">
                        <Button
                            onClick={() => fetchNextPage()}
                            disabled={isFetchingNextPage}
                            text={isFetchingNextPage ? 'Loading...' : 'Load More'}
                        />
                    </div>
                )}
            </div>
        </Panel>
    );
}

interface RecordsContentProps {
    records: Record[];
    error: Error | null;
}

function RecordsContent({ records, error }: RecordsContentProps) {
    if (error) {
        return (
            <InfoBox
                title="Failed to load records"
                supportingText={error.message}
                type={InfoBoxType.Error}
                style={InfoBoxStyle.Elevated}
                icon={<Warning />}
            />
        );
    }

    if (records.length === 0) {
        return (
            <InfoBox
                title="No records found"
                supportingText="This audit trail has no records yet."
                type={InfoBoxType.Default}
                style={InfoBoxStyle.Elevated}
                icon={<Info />}
            />
        );
    }

    return <TableCard data={records} columns={generateRecordsTableColumns()} />;
}

export function formatDataPreview(data: Data): string {
    const dataValue = data.value;

    return typeof dataValue === 'string' ? dataValue : `0x${toHex(data.toBytes())}`;
}

function DataPreviewCell({ data }: { data: Data }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isBinary = typeof data.value !== 'string';
    const dataString = formatDataPreview(data);
    const dataTitle = isBinary ? 'Binary data encoded as hexadecimal' : undefined;

    if (dataString.length <= PREVIEW_LENGTH) {
        return (
            <TableCellBase>
                <TableCellText>
                    <span title={dataTitle}>{dataString}</span>
                </TableCellText>
            </TableCellBase>
        );
    }

    return (
        <TableCellBase>
            <TableCellText>
                <span className="flex flex-col items-start gap-xxs">
                    <span
                        className={clsx(
                            'whitespace-pre-wrap break-all',
                            isExpanded &&
                                'max-h-[300px] overflow-y-auto rounded-md border border-iota-neutral-92 p-xs dark:border-iota-neutral-12',
                        )}
                        title={dataTitle}
                    >
                        {isExpanded ? dataString : `${dataString.slice(0, PREVIEW_LENGTH)}...`}
                    </span>
                    <ButtonUnstyled
                        className="shrink-0 text-label-sm text-iota-primary-30 dark:text-iota-primary-80"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? 'Show Less' : 'Show More'}
                    </ButtonUnstyled>
                </span>
            </TableCellText>
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
                        <DateDisplay timestamp={Number(getValue<bigint>())} />
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
