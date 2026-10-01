// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeSize, BadgeType, TableCellBase, TableCellText } from '@iota/apps-ui-kit';
import type { ColumnDef } from '@tanstack/react-table';
import { ImageIcon, ImageIconSize, useCoinRegistryEntry, useCopyToClipboard } from '@iota/core';
import { CoinFormat, formatBalance } from '@iota/iota-sdk/utils';
import { AddressLink, CoinLink } from '~/components/ui';
import { DateDisplay } from '~/components';
import { Copy, RecognizedBadge } from '@iota/apps-ui-icons';
import type { OnChainCoin } from '~/hooks';

interface GenerateCoinsTableColumnsArgs {
    includeColumns?: string[];
    recognizedCoins?: OnChainCoin[];
}

function CoinWithImage({
    coin,
    recognizedCoins = [],
}: {
    coin: OnChainCoin;
    recognizedCoins?: OnChainCoin[];
}) {
    const { coinType, name, symbol, iconUrl } = coin;
    const isRecognized = !!useCoinRegistryEntry(coinType);
    const isPossibleImitation =
        !isRecognized &&
        recognizedCoins.some(
            (recognized) =>
                isSameLabel(recognized.name, name) || isSameLabel(recognized.symbol, symbol),
        );
    const truncatedCoinType = `${coinType.slice(0, 8)}…${coinType.slice(-20)}`;
    const copyToClipboard = useCopyToClipboard();

    const coinNameContainer = (
        <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-label-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                    {name}
                </span>
                {isRecognized && <RecognizedBadge className="size-4 text-iota-primary-40" />}
                {isPossibleImitation && (
                    <span title="Same name or symbol as a recognized coin, but a different coin type.">
                        <Badge
                            type={BadgeType.Warning}
                            size={BadgeSize.Small}
                            label="Possible imitation"
                        />
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1">
                <span className="text-label-sm tabular-nums text-iota-neutral-40 dark:text-iota-neutral-60">
                    {truncatedCoinType}
                </span>
                <button
                    type="button"
                    aria-label="Copy coin type"
                    className="flex items-center text-iota-neutral-40 transition-colors hover:text-iota-neutral-10 dark:text-iota-neutral-60 dark:hover:text-iota-neutral-92"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        copyToClipboard(coinType);
                    }}
                >
                    <Copy className="h-3 w-3" />
                </button>
            </div>
        </div>
    );

    const avatarElement = (
        <div className="h-8 w-8 shrink-0">
            <ImageIcon
                src={iconUrl}
                label={name}
                fallback={symbol}
                size={ImageIconSize.Medium}
                rounded
            />
        </div>
    );

    return (
        <CoinLink
            coin={coinType}
            label={
                <div className="flex items-center gap-x-2.5 text-iota-neutral-40 dark:text-iota-neutral-60">
                    {avatarElement}
                    {coinNameContainer}
                </div>
            }
        />
    );
}

export function generateCoinsTableColumns({
    includeColumns,
    recognizedCoins,
}: GenerateCoinsTableColumnsArgs = {}): ColumnDef<OnChainCoin>[] {
    let columns: ColumnDef<OnChainCoin>[] = [
        {
            header: 'Coin',
            id: 'name',
            accessorKey: 'name',
            enableSorting: true,
            sortingFn: (row1, row2, columnId) =>
                sortByString(row1.getValue<string>(columnId), row2.getValue<string>(columnId)),
            cell({ row }) {
                return (
                    <TableCellBase>
                        <CoinWithImage coin={row.original} recognizedCoins={recognizedCoins} />
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Symbol',
            accessorKey: 'symbol',
            enableSorting: true,
            sortingFn: (row1, row2, columnId) =>
                sortByString(row1.getValue<string>(columnId), row2.getValue<string>(columnId)),
            cell({ getValue }) {
                return (
                    <TableCellBase>
                        <TableCellText>{getValue<OnChainCoin['symbol']>()}</TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Creator',
            meta: {
                tooltip: 'The address that published this coin.',
            },
            accessorKey: 'creator',
            cell({ getValue }) {
                const creator = getValue<OnChainCoin['creator']>();
                return (
                    <TableCellBase>
                        {creator ? (
                            <AddressLink address={creator} copyText={creator} />
                        ) : (
                            <TableCellText>--</TableCellText>
                        )}
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Supply',
            meta: {
                tooltip:
                    'Total amount of this coin in existence. Shows -- when it cannot be read from the chain.',
            },
            accessorKey: 'supply',
            cell({ row }) {
                const { supply, decimals, symbol } = row.original;
                return (
                    <TableCellBase>
                        <TableCellText>
                            {supply
                                ? `${formatBalance(supply, decimals, CoinFormat.Rounded)} ${symbol}`
                                : '--'}
                        </TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Created',
            meta: {
                tooltip: 'When this coin was published.',
            },
            accessorKey: 'createdAt',
            enableSorting: true,
            sortUndefined: 'last',
            cell({ getValue }) {
                const createdAt = getValue<OnChainCoin['createdAt']>();
                return (
                    <TableCellBase>
                        <TableCellText>
                            {createdAt ? <DateDisplay timestamp={createdAt} type="table" /> : '--'}
                        </TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Decimals',
            accessorKey: 'decimals',
            enableSorting: true,
            cell({ getValue }) {
                return (
                    <TableCellBase>
                        <TableCellText>{getValue<OnChainCoin['decimals']>()}</TableCellText>
                    </TableCellBase>
                );
            },
        },
    ];

    if (includeColumns) {
        columns = columns.filter((col) =>
            includeColumns.includes(col.header?.toString() as string),
        );
    }

    return columns;
}

function sortByString(value1: string, value2: string) {
    return value1.localeCompare(value2, undefined, { sensitivity: 'base' });
}

function isSameLabel(value1: string, value2: string) {
    return value1.trim().toLowerCase() === value2.trim().toLowerCase();
}
