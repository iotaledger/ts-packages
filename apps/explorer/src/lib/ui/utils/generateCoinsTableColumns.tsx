// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { TableCellBase, TableCellText, Tooltip, TooltipPosition } from '@iota/apps-ui-kit';
import type { ColumnDef } from '@tanstack/react-table';
import {
    CoinFiatValue,
    ImageIcon,
    ImageIconSize,
    useCoinRegistryEntry,
    useCopyToClipboard,
} from '@iota/core';
import { CoinFormat, formatBalance } from '@iota/iota-sdk/utils';
import { AddressLink, CoinLink } from '~/components/ui';
import { DateDisplay } from '~/components';
import { Copy, RecognizedBadge, Warning } from '@iota/apps-ui-icons';
import type { OnChainCoin } from '~/hooks';
import { getSameNameWarningTitle, SAME_NAME_WARNING_TEXT } from '~/lib/constants';
import { findMatchingRecognizedCoin } from '~/lib/utils';

interface GenerateCoinsTableColumnsArgs {
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
    const matchingRecognizedCoin = findMatchingRecognizedCoin(coin, recognizedCoins);
    const truncatedCoinType = `${coinType.slice(0, 8)}…${coinType.slice(-20)}`;
    const copyToClipboard = useCopyToClipboard();

    const coinNameContainer = (
        <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-label-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                    {name}
                </span>
                {isRecognized && <RecognizedBadge className="size-4 text-iota-primary-40" />}
                <span className="text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                    {symbol}
                </span>
                {matchingRecognizedCoin && (
                    <Tooltip
                        text={`${getSameNameWarningTitle(matchingRecognizedCoin.name)}. ${SAME_NAME_WARNING_TEXT}`}
                        position={TooltipPosition.Top}
                    >
                        <Warning
                            aria-label={getSameNameWarningTitle(matchingRecognizedCoin.name)}
                            className="size-4 text-iota-warning-40 dark:text-iota-warning-60"
                        />
                    </Tooltip>
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
    recognizedCoins,
}: GenerateCoinsTableColumnsArgs = {}): ColumnDef<OnChainCoin>[] {
    const recognizedTypes = new Set(recognizedCoins?.map(({ coinType }) => coinType));
    return [
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
                const { supply, decimals, symbol, coinType } = row.original;
                if (!supply) {
                    return (
                        <TableCellBase>
                            <TableCellText>--</TableCellText>
                        </TableCellBase>
                    );
                }
                return (
                    <TableCellBase>
                        <div className="flex flex-col gap-0.5">
                            <TableCellText>
                                {`${formatBalance(supply, decimals, CoinFormat.Full)} ${symbol}`}
                            </TableCellText>
                            {recognizedTypes.has(coinType) && (
                                <CoinFiatValue
                                    amount={supply}
                                    coinType={coinType}
                                    withParentheses={false}
                                />
                            )}
                        </div>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Created',
            meta: {
                tooltip: 'When this coin was published.',
            },
            id: 'createdAt',
            accessorFn: (coin) => coin.createdAt ?? undefined,
            enableSorting: true,
            sortUndefined: 'last',
            cell({ getValue }) {
                const createdAt = getValue<number | undefined>();
                return (
                    <TableCellBase>
                        <TableCellText>
                            {createdAt ? <DateDisplay timestamp={createdAt} type="table" /> : '--'}
                        </TableCellText>
                    </TableCellBase>
                );
            },
        },
    ];
}

function sortByString(value1: string, value2: string) {
    return value1.localeCompare(value2, undefined, { sensitivity: 'base' });
}
