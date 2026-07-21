// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { TableCellBase, TableCellText } from '@iota/apps-ui-kit';
import {
    CoinFiatValue,
    CoinIcon,
    ImageIconSize,
    useFormatCoin,
    type BalanceChange,
} from '@iota/core';
import { CoinFormat } from '@iota/iota-sdk/utils';
import type { ColumnDef } from '@tanstack/react-table';
import clsx from 'clsx';
import { AddressLink } from '~/components/ui';

export interface BalanceChangeTableRow {
    ownerAddress: string;
    change: BalanceChange;
}

function BalanceChangeAmountCell({ change }: { change: BalanceChange }): JSX.Element {
    const { amount, coinType } = change;
    const isPositive = BigInt(amount) > 0n;
    const [formatted, symbol] = useFormatCoin({
        balance: amount,
        coinType,
        format: CoinFormat.Full,
    });

    return (
        <TableCellBase>
            <div className="flex flex-col gap-xxxs">
                <span
                    className={clsx(
                        'text-body-md',
                        isPositive
                            ? 'text-iota-tertiary-30 dark:text-iota-tertiary-80'
                            : 'text-iota-error-30 dark:text-iota-error-80',
                    )}
                >
                    {isPositive ? '+' : ''}
                    {formatted} {symbol}
                </span>
                <CoinFiatValue coinType={coinType} amount={amount} withParentheses={false} />
            </div>
        </TableCellBase>
    );
}

function BalanceChangeCurrencyCell({ coinType }: { coinType: string }): JSX.Element {
    const [, symbol] = useFormatCoin({ coinType });

    return (
        <TableCellBase>
            <div className="flex flex-row items-center gap-xxs">
                <CoinIcon coinType={coinType} size={ImageIconSize.Small} />
                <TableCellText>{symbol}</TableCellText>
            </div>
        </TableCellBase>
    );
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
            cell: ({ row }) => <BalanceChangeAmountCell change={row.original.change} />,
        },
        {
            header: 'Currency',
            id: 'currency',
            cell: ({ row }) => (
                <BalanceChangeCurrencyCell coinType={row.original.change.coinType} />
            ),
        },
    ];
}
