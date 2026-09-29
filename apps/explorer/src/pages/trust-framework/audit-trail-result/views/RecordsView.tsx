// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type AuditTrailHandle, type Record, type Data } from '@iota/audit-trails/web';
import { usePaginatedAuditTrailRecords } from '~/hooks/useResolveAuditTrail';
import {
    TableCellBase,
    TableCellText,
    Button,
    ButtonUnstyled,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    Dialog,
    DialogContent,
    DialogBody,
    Header,
    KeyValueInfo,
    Badge,
    BadgeType,
} from '@iota/apps-ui-kit';
import { Info, Warning } from '@iota/apps-ui-icons';
import { TableCard, PlaceholderTable, AddressLink } from '~/components/ui';
import { DateDisplay, SyntaxHighlighter } from '~/components';
import { OutlinedCopyButton } from '@iota/core';
import { type ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { toHex } from '@iota/iota-sdk/utils';

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
        <div className="flex flex-col gap-sm">
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

function toSyntaxHighlightedData(data: string): { code: string; language: 'json' | 'text' } {
    try {
        return { code: JSON.stringify(JSON.parse(data), null, 2), language: 'json' };
    } catch {
        return { code: data, language: 'text' };
    }
}

function RecordStatusBadge({ record }: { record: Record }) {
    const isReplacedBy = record.correction?.isReplacedBy;

    return isReplacedBy !== undefined ? (
        <Badge type={BadgeType.Neutral} label={`Replaced by ${isReplacedBy}`} />
    ) : (
        <Badge type={BadgeType.Success} label="Active" />
    );
}

function DataPreviewCell({ record }: { record: Record }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const isBinary = typeof record.data.value !== 'string';
    const dataString = formatDataPreview(record.data);
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
                    <span className="whitespace-pre-wrap break-all" title={dataTitle}>
                        {`${dataString.slice(0, PREVIEW_LENGTH)}...`}
                    </span>
                    <ButtonUnstyled
                        className="shrink-0 text-label-sm text-iota-primary-30 dark:text-iota-primary-80"
                        onClick={() => setIsModalOpen(true)}
                    >
                        Show More
                    </ButtonUnstyled>
                </span>
            </TableCellText>
            <RecordDetailsDialog
                record={record}
                data={dataString}
                isBinary={isBinary}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </TableCellBase>
    );
}

interface RecordDetailsDialogProps {
    record: Record;
    data: string;
    isBinary: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function RecordDetailsDialog({
    record,
    data,
    isBinary,
    open,
    onOpenChange,
}: RecordDetailsDialogProps) {
    const { code, language } = toSyntaxHighlightedData(data);
    const dataLabel = isBinary ? 'Data (Hex)' : language === 'json' ? 'Data (JSON)' : 'Data (Text)';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseOnOverlay isFixedPosition customWidth="w-[720px] max-w-[92vw]">
                <Header
                    title={`Record #${record.sequenceNumber.toString()}`}
                    onClose={() => onOpenChange(false)}
                />
                <DialogBody>
                    <div className="flex flex-col gap-md">
                        <div className="flex flex-col gap-sm">
                            <KeyValueInfo keyText="Tag" value={record.tag || 'N/A'} fullwidth />
                            <KeyValueInfo
                                keyText="Added By"
                                value={
                                    <AddressLink
                                        address={record.addedBy}
                                        copyText={record.addedBy}
                                    />
                                }
                                fullwidth
                            />
                            <KeyValueInfo
                                keyText="Added At"
                                value={<DateDisplay timestamp={Number(record.addedAt)} />}
                                fullwidth
                            />
                            <KeyValueInfo
                                keyText="Status"
                                value={<RecordStatusBadge record={record} />}
                                fullwidth
                            />
                        </div>
                        <div className="flex flex-col">
                            <div className="relative rounded-md border border-iota-neutral-92 dark:border-iota-neutral-12">
                                <div className="max-h-[50vh] overflow-auto">
                                    <SyntaxHighlighter code={code} language={language} />
                                </div>
                                <div className="absolute right-[0.875rem] top-xs mr-xs">
                                    <OutlinedCopyButton textToCopy={data} />
                                </div>
                            </div>
                            <span className="mt-1 text-body-sm text-gray-500 dark:text-gray-400">
                                {dataLabel}
                            </span>
                        </div>
                    </div>
                </DialogBody>
            </DialogContent>
        </Dialog>
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
            cell: ({ row }) => <DataPreviewCell record={row.original} />,
        },
        {
            accessorKey: 'addedBy',
            header: 'Added By',
            cell: ({ getValue }) => (
                <TableCellBase>
                    <AddressLink
                        address={getValue<string>()}
                        copyText={getValue<string>()}
                        className="[&>div]:max-w-[200px] [&>div]:truncate"
                    />
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
            cell: ({ row }) => (
                <TableCellBase>
                    <RecordStatusBadge record={row.original} />
                </TableCellBase>
            ),
        },
    ];
}
