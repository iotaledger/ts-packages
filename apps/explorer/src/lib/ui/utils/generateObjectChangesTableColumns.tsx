// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Badge,
    BadgeSize,
    BadgeType,
    ButtonUnstyled,
    TableCellBase,
    TableCellText,
} from '@iota/apps-ui-kit';
import { Copy, TriangleDown } from '@iota/apps-ui-icons';
import { ObjectChangeLabels, useCopyToClipboard, type IotaObjectChangeTypes } from '@iota/core';
import { type DisplayFieldsResponse } from '@iota/iota-sdk/client';
import { formatDigest, parseStructTag } from '@iota/iota-sdk/utils';
import type { ColumnDef } from '@tanstack/react-table';
import clsx from 'clsx';
import { AddressLink, ObjectLink, ObjectVideoImage } from '~/components/ui';

function getShortObjectType(objectType: string): string {
    try {
        const { module, name, typeParams } = parseStructTag(objectType);
        const typeParamsLabel = typeParams.length
            ? `<${typeParams
                  .map(
                      (typeParam) =>
                          `…${typeof typeParam === 'string' ? typeParam : typeParam.name}`,
                  )
                  .join(', ')}>`
            : '';
        return `${module}::${name}${typeParamsLabel}`;
    } catch {
        return objectType;
    }
}

export interface ObjectChangeTableRow {
    objectId: string;
    ownerAddress?: string;
    ownerType?: string;
    objectType?: string;
    status: IotaObjectChangeTypes;
    version?: string;
    previousVersion?: string;
    digest?: string;
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

function ExpandIndicator({
    canExpand,
    isExpanded,
}: {
    canExpand: boolean;
    isExpanded: boolean;
}): JSX.Element {
    return (
        <TriangleDown
            aria-hidden="true"
            className={clsx(
                'h-4 w-4 shrink-0 text-iota-neutral-40 transition-transform ease-linear dark:text-iota-neutral-60',
                !canExpand && 'invisible',
                isExpanded ? 'rotate-0' : '-rotate-90',
            )}
        />
    );
}

function ObjectTypeCell({ objectType }: { objectType?: string }): JSX.Element {
    const copyToClipboard = useCopyToClipboard();

    return (
        <TableCellBase>
            <div className="flex items-center gap-xxs" title={objectType}>
                <Badge
                    type={BadgeType.PrimarySoft}
                    label={objectType ? getShortObjectType(objectType) : 'Package'}
                    size={BadgeSize.Small}
                />
                {objectType && (
                    <ButtonUnstyled
                        onClick={() => copyToClipboard(objectType)}
                        aria-label="Copy to clipboard"
                    >
                        <Copy className="shrink-0 text-iota-neutral-60 dark:text-iota-neutral-40" />
                    </ButtonUnstyled>
                )}
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

export function NewDigestCell({ digest }: { digest?: string }): JSX.Element {
    return (
        <TableCellBase>
            <TableCellText>{digest ? formatDigest(digest) : '-'}</TableCellText>
        </TableCellBase>
    );
}

export function generateObjectChangesTableColumns(
    isAdvancedMode?: boolean,
): ColumnDef<ObjectChangeTableRow>[] {
    return [
        {
            header: 'Object ID',
            id: 'objectId',
            cell: ({ row }) => {
                const { name, image_url: imageUrl } = row.original.display?.data ?? {};
                return (
                    <TableCellBase>
                        <div className="flex flex-row items-center gap-sm py-xs">
                            <ExpandIndicator
                                canExpand={row.getCanExpand()}
                                isExpanded={row.getIsExpanded()}
                            />
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
        ...(isAdvancedMode
            ? [
                  {
                      header: 'Previous Version',
                      id: 'previousVersion',
                      meta: {
                          tooltip: 'The version of the object before this transaction modified it.',
                      },
                      cell: ({ row }: { row: { original: ObjectChangeTableRow } }) => (
                          <TableCellBase>
                              <TableCellText>
                                  {row.original.previousVersion
                                      ? `v${row.original.previousVersion}`
                                      : '-'}
                              </TableCellText>
                          </TableCellBase>
                      ),
                  },
                  {
                      header: 'New Digest',
                      id: 'digest',
                      cell: ({ row }: { row: { original: ObjectChangeTableRow } }) => (
                          <NewDigestCell digest={row.original.digest} />
                      ),
                  },
              ]
            : []),
    ];
}
