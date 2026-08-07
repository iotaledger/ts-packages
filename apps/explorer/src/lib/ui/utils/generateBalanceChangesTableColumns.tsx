// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { TableCellBase, TableCellText, Tooltip } from '@iota/apps-ui-kit';
import {
    CoinFiatValue,
    CoinIcon,
    ImageIconSize,
    useFormatCoin,
    type BalanceChange,
} from '@iota/core';
import { useIotaClient } from '@iota/dapp-kit';
import { CoinFormat } from '@iota/iota-sdk/utils';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import clsx from 'clsx';
import { AddressLink } from '~/components/ui';

export interface BalanceChangeTableRow {
    ownerAddress: string;
    change: BalanceChange;
}

/**
 * Fetches the coin's untruncated symbol to use as a tooltip, without altering the
 * shared `useFormatCoin`/`useCoinMetadata` hooks (used across many other places).
 */
function useFullCoinSymbol(coinType: string, truncatedSymbol: string): string | undefined {
    const client = useIotaClient();
    const { data } = useQuery({
        queryKey: ['coin-metadata-full-symbol', coinType],
        queryFn: () => client.getCoinMetadata({ coinType }),
        retry: false,
        staleTime: Infinity,
        gcTime: 24 * 60 * 60 * 1000,
    });

    return data?.symbol && data.symbol !== truncatedSymbol ? data.symbol : undefined;
}

function BalanceChangeAmountCell({ change }: { change: BalanceChange }): JSX.Element {
    const { amount, coinType } = change;
    const isPositive = BigInt(amount) > 0n;
    const [formatted, symbol] = useFormatCoin({
        balance: amount,
        coinType,
        format: CoinFormat.Full,
    });
    const fullSymbol = useFullCoinSymbol(coinType, symbol);

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
                    {formatted}{' '}
                    {fullSymbol ? <Tooltip text={fullSymbol}>{symbol}</Tooltip> : symbol}
                </span>
                <CoinFiatValue coinType={coinType} amount={amount} withParentheses={false} />
            </div>
        </TableCellBase>
    );
}

function BalanceChangeCurrencyCell({ coinType }: { coinType: string }): JSX.Element {
    const [, symbol] = useFormatCoin({ coinType });
    const fullSymbol = useFullCoinSymbol(coinType, symbol);

    return (
        <TableCellBase>
            <div className="flex flex-row items-center gap-xxs">
                <div className="h-5 w-5 shrink-0">
                    <CoinIcon coinType={coinType} size={ImageIconSize.Small} />
                </div>
                <TableCellText>
                    {fullSymbol ? <Tooltip text={fullSymbol}>{symbol}</Tooltip> : symbol}
                </TableCellText>
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
