// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { TableCellBase, TableCellText } from '@iota/apps-ui-kit';
import { type BalanceChange } from '@iota/core';
import type { ColumnDef } from '@tanstack/react-table';
import { TableCoinDisplay } from '~/components';
import { AddressLink } from '~/components/ui';

export interface BalanceChangeTableRow {
    ownerAddress: string;
    change: BalanceChange;
}

export function generateBalanceChangesTableColumns(): ColumnDef<BalanceChangeTableRow>[] {
    return [
        {
            header: 'ID',
            id: 'ownerAddress',
            cell: ({ row }) => (
                <TableCellBase>
                    <AddressLink
                        address={row.original.ownerAddress}
                        copyText={row.original.ownerAddress}
                        className="[&>div]:max-w-[200px] [&>div]:truncate"
                    />
                </TableCellBase>
            ),
        },
        {
            header: 'Type',
            id: 'type',
            cell: () => (
                <TableCellBase>
                    <TableCellText>Account</TableCellText>
                </TableCellBase>
            ),
        },
        {
            header: 'Change',
            id: 'change',
            cell: ({
                row: {
                    original: {
                        change: { amount, coinType },
                    },
                },
            }) => (
                <TableCellBase>
                    <TableCoinDisplay
                        amount={amount}
                        coinType={coinType}
                        showSign
                        showTrustedBadge
                        truncate={false}
                    />
                </TableCellBase>
            ),
        },
    ];
}
