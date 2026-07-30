// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeType, ButtonUnstyled, TableCellBase, TableCellText } from '@iota/apps-ui-kit';
import { Copy } from '@iota/apps-ui-icons';
import { ObjectChangeLabels, useCopyToClipboard, type IotaObjectChangeTypes } from '@iota/core';
import { type DisplayFieldsResponse } from '@iota/iota-sdk/client';
import type { ColumnDef } from '@tanstack/react-table';
import { AddressLink, ObjectLink, ObjectVideoImage } from '~/components/ui';

export interface ObjectChangeTableRow {
    objectId: string;
    ownerAddress?: string;
    ownerType?: string;
    objectType?: string;
    status: IotaObjectChangeTypes;
    version?: string;
    display?: DisplayFieldsResponse;
}

const STATUS_BADGE_TYPE: Record<IotaObjectChangeTypes, BadgeType> = {
    created: BadgeType.Success,
    mutated: BadgeType.Warning,
    transferred: BadgeType.PrimarySoft,
    published: BadgeType.PrimarySoft,
    deleted: BadgeType.Error,
    wrapped: BadgeType.Neutral,
    unwrapped: BadgeType.Neutral,
};

function ObjectTypeCell({ objectType }: { objectType?: string }): JSX.Element {
    const copyToClipboard = useCopyToClipboard();

    if (!objectType) {
        return (
            <TableCellBase>
                <TableCellText>Package</TableCellText>
            </TableCellBase>
        );
    }

    return (
        <TableCellBase>
            <div className="flex min-w-0 items-center gap-xxs">
                <TableCellText>
                    <span className="block max-w-[140px] truncate" title={objectType}>
                        {objectType}
                    </span>
                </TableCellText>
                <ButtonUnstyled
                    onClick={() => copyToClipboard(objectType)}
                    aria-label="Copy to clipboard"
                >
                    <Copy className="shrink-0 text-iota-neutral-60 dark:text-iota-neutral-40" />
                </ButtonUnstyled>
            </div>
        </TableCellBase>
    );
}

function CurrentOwnerCell({
    ownerAddress,
    ownerType,
}: {
    ownerAddress?: string;
    ownerType?: string;
}): JSX.Element {
    if (!ownerAddress || !ownerType) {
        return (
            <TableCellBase>
                <TableCellText>-</TableCellText>
            </TableCellBase>
        );
    }

    return (
        <TableCellBase>
            {ownerType === 'AddressOwner' && (
                <AddressLink
                    address={ownerAddress}
                    copyText={ownerAddress}
                    className="[&>div]:max-w-[200px] [&>div]:truncate"
                    hideAlias
                />
            )}
            {ownerType === 'ObjectOwner' && (
                <ObjectLink
                    objectId={ownerAddress}
                    copyText={ownerAddress}
                    className="[&>div]:max-w-[200px] [&>div]:truncate"
                />
            )}
            {ownerType === 'Shared' && <Badge type={BadgeType.Neutral} label="Shared" />}
        </TableCellBase>
    );
}

export function generateObjectChangesTableColumns(): ColumnDef<ObjectChangeTableRow>[] {
    return [
        {
            header: 'Object ID',
            id: 'objectId',
            cell: ({ row }) => {
                const { name, image_url: imageUrl } = row.original.display?.data ?? {};
                return (
                    <TableCellBase>
                        <div className="flex flex-row items-center gap-sm py-xs">
                            {row.original.display?.data && (
                                <ObjectVideoImage
                                    variant="xxs"
                                    rounded="md"
                                    title={name ?? 'NFT'}
                                    subtitle=""
                                    src={imageUrl ?? ''}
                                    disablePreview
                                />
                            )}
                            <div className="flex flex-col gap-xs">
                                {name && <TableCellText>{name}</TableCellText>}
                                <ObjectLink
                                    objectId={row.original.objectId}
                                    copyText={row.original.objectId}
                                    className="[&>div]:max-w-[200px] [&>div]:truncate"
                                />
                            </div>
                        </div>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Current Owner',
            id: 'currentOwner',
            cell: ({ row }) => (
                <CurrentOwnerCell
                    ownerAddress={row.original.ownerAddress}
                    ownerType={row.original.ownerType}
                />
            ),
        },
        {
            header: 'Type',
            id: 'type',
            cell: ({ row }) => <ObjectTypeCell objectType={row.original.objectType} />,
        },
        {
            header: 'Status',
            id: 'status',
            cell: ({ row }) => (
                <TableCellBase>
                    <Badge
                        type={STATUS_BADGE_TYPE[row.original.status]}
                        label={ObjectChangeLabels[row.original.status]}
                    />
                </TableCellBase>
            ),
        },
        {
            header: 'Version',
            id: 'version',
            cell: ({ row }) => (
                <TableCellBase>
                    <TableCellText>{row.original.version ?? '-'}</TableCellText>
                </TableCellBase>
            ),
        },
    ];
}
