// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeSize, BadgeType, TableCellBase, TableCellText } from '@iota/apps-ui-kit';
import { formatAddress, formatDigest } from '@iota/iota-sdk/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { ObjectLink, TransactionLink } from '~/components/ui';
import type { PackageVersion } from '~/hooks';

export function generatePackageVersionsTableColumns(
    currentPackageId: string,
): ColumnDef<PackageVersion>[] {
    return [
        {
            header: 'Version',
            accessorKey: 'version',
            cell: ({ row }) => (
                <TableCellBase>
                    <div className="flex flex-row items-center gap-xs">
                        <TableCellText>v{row.original.version}</TableCellText>
                        {row.original.address === currentPackageId && (
                            <Badge
                                type={BadgeType.PrimarySoft}
                                size={BadgeSize.Small}
                                label="Viewing"
                            />
                        )}
                    </div>
                </TableCellBase>
            ),
        },
        {
            header: 'Package Address',
            accessorKey: 'address',
            cell: ({ getValue }) => {
                const address = getValue<PackageVersion['address']>();
                return (
                    <TableCellBase>
                        <ObjectLink
                            objectId={address}
                            label={<TableCellText>{formatAddress(address)}</TableCellText>}
                            copyText={address}
                        />
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Published In',
            accessorKey: 'previousTransaction',
            cell: ({ getValue }) => {
                const digest = getValue<PackageVersion['previousTransaction']>();
                return (
                    <TableCellBase>
                        {digest ? (
                            <TransactionLink
                                digest={digest}
                                label={<TableCellText>{formatDigest(digest)}</TableCellText>}
                                copyText={digest}
                            />
                        ) : (
                            <TableCellText>--</TableCellText>
                        )}
                    </TableCellBase>
                );
            },
        },
    ];
}
