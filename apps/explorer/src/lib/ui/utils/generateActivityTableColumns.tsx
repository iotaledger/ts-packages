// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    getTotalGasUsed,
    getTransactionAction,
    TransactionIcon,
    TransactionIconSize,
} from '@iota/core';
import type { IotaTransactionBlockKind, IotaTransactionBlockResponse } from '@iota/iota-sdk/client';

import { TableCellBase, TableCellText, Tooltip } from '@iota/apps-ui-kit';
import type { ColumnDef } from '@tanstack/react-table';
import { AddressLink, ObjectLink, TransactionLink } from '../../../components/ui';
import {
    CoinFormat,
    formatBalance,
    formatDigest,
    IOTA_TYPE_ARG,
    NANOS_PER_IOTA,
} from '@iota/iota-sdk/utils';
import { DateDisplay } from '~/components';
import {
    BalanceChangeFiatValue,
    getBalanceChangeColorClass,
    getIotaBalanceChangeForAddress,
    getLastMoveCall,
    getTransactionTypeLabel,
} from './generateTransactionsTableColumns';

function getCounterpartyAddress(
    txn: IotaTransactionBlockResponse,
    address: string,
): string | undefined {
    const sender = txn.transaction?.data.sender;
    if (sender && sender !== address) {
        return sender;
    }
    const recipient = txn.balanceChanges?.find(
        (change) =>
            change.owner &&
            typeof change.owner === 'object' &&
            'AddressOwner' in change.owner &&
            change.owner.AddressOwner !== address &&
            Number(change.amount) > 0,
    );
    return recipient && typeof recipient.owner === 'object' && 'AddressOwner' in recipient.owner
        ? recipient.owner.AddressOwner
        : undefined;
}

/**
 * Generate table columns renderers for the "Activity" view of an address's transactions:
 * a more digestible, human-friendly presentation than the raw "Transaction Blocks" table.
 */
export function generateActivityTableColumns(
    address: string,
): ColumnDef<IotaTransactionBlockResponse>[] {
    return [
        {
            header: 'Type',
            accessorKey: 'Type',
            cell: ({ row }) => {
                const txn = row.original;
                const digest = txn.digest;
                const isSuccess = txn.effects?.status.status === 'success';
                const action = getTransactionAction(txn, address);
                const typeLabel = getTransactionTypeLabel(txn, action, isSuccess);
                return (
                    <TableCellBase>
                        <TransactionLink
                            digest={digest}
                            copyText={digest}
                            label={
                                <div className="flex items-center gap-xs">
                                    <TransactionIcon
                                        variant={action}
                                        txnFailed={!isSuccess}
                                        size={TransactionIconSize.Small}
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-label-lg text-iota-neutral-40 dark:text-iota-neutral-60">
                                            {typeLabel}
                                        </span>
                                        <span className="text-body-sm text-iota-primary-30 dark:text-iota-primary-80">
                                            {formatDigest(digest)}
                                        </span>
                                    </div>
                                </div>
                            }
                        />
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Function',
            accessorKey: 'function',
            cell: ({ row }) => {
                const kind = row.original.transaction?.data.transaction.kind;
                const kindLabel = kind === 'ProgrammableTransaction' ? 'Programmable Tx' : '--';
                const moveCall = getLastMoveCall(row.original);
                return (
                    <TableCellBase>
                        <div className="flex flex-col">
                            <span className="text-label-lg text-iota-neutral-40 dark:text-iota-neutral-60">
                                {kindLabel}
                            </span>
                            {moveCall && (
                                <ObjectLink
                                    objectId={`${moveCall.package}?module=${moveCall.module}`}
                                    copyText={moveCall.package}
                                    showAddressAlias={false}
                                    label={moveCall.function}
                                    className="text-body-sm"
                                />
                            )}
                        </div>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Sender',
            accessorKey: 'transaction.data.sender',
            meta: { tooltip: 'The address that signed and submitted this transaction.' },
            cell: ({ getValue }) => {
                const sender = getValue<string>();
                return (
                    <TableCellBase>
                        <AddressLink
                            address={sender}
                            copyText={sender}
                            className="[&>div]:max-w-[200px] [&>div]:truncate"
                            hideAlias
                            showValidatorImage
                        />
                    </TableCellBase>
                );
            },
        },
        {
            header: 'With',
            accessorKey: 'with',
            meta: {
                tooltip: 'Who this address sent to, or received from.',
            },
            cell: ({ row }) => {
                const counterparty = getCounterpartyAddress(row.original, address);
                if (!counterparty) {
                    return (
                        <TableCellBase>
                            <TableCellText>--</TableCellText>
                        </TableCellBase>
                    );
                }
                return (
                    <TableCellBase>
                        <AddressLink
                            address={counterparty}
                            copyText={counterparty}
                            className="[&>div]:max-w-[200px] [&>div]:truncate"
                            hideAlias
                            showValidatorImage
                        />
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Balance Change',
            accessorKey: 'balanceChanges',
            cell: ({ row }) => {
                const txn = row.original;
                const balanceChange = getIotaBalanceChangeForAddress(txn, address);
                const otherCoinChangesCount =
                    txn.balanceChanges?.filter(
                        (change) =>
                            change.owner &&
                            typeof change.owner === 'object' &&
                            'AddressOwner' in change.owner &&
                            change.owner.AddressOwner === address &&
                            change.coinType !== IOTA_TYPE_ARG,
                    ).length ?? 0;

                if (!balanceChange) {
                    return (
                        <TableCellBase>
                            <TableCellText>--</TableCellText>
                        </TableCellBase>
                    );
                }

                const amount = balanceChange.amount;
                const formatted = formatBalance(
                    Math.abs(Number(amount)) / Number(NANOS_PER_IOTA),
                    0,
                    CoinFormat.Rounded,
                );
                const isPositive = Number(amount) >= 0;
                const sign = isPositive ? '+' : '-';

                return (
                    <TableCellBase>
                        <div className="flex flex-col">
                            <span
                                className={`text-label-lg ${getBalanceChangeColorClass(isPositive)}`}
                            >
                                {sign + formatted} IOTA
                            </span>
                            <BalanceChangeFiatValue amount={amount} />
                            {otherCoinChangesCount > 0 && (
                                <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                                    +{otherCoinChangesCount} other coin
                                    {otherCoinChangesCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Gas Fee',
            accessorKey: 'effects',
            cell: ({ getValue }) => {
                const effects = getValue<IotaTransactionBlockResponse['effects']>();
                const totalGasUsed = effects ? getTotalGasUsed(effects)?.toString() : undefined;
                const totalGasUsedFormatted = totalGasUsed
                    ? formatBalance(
                          Number(totalGasUsed) / Number(NANOS_PER_IOTA),
                          0,
                          CoinFormat.Full,
                      )
                    : '--';
                return (
                    <TableCellBase>
                        <div className="flex flex-row items-center gap-1">
                            {totalGasUsed ? (
                                <Tooltip text={`${totalGasUsedFormatted} IOTA`}>
                                    <span className="block max-w-[120px] truncate">
                                        {totalGasUsedFormatted}
                                    </span>
                                </Tooltip>
                            ) : (
                                <span>{totalGasUsedFormatted}</span>
                            )}
                            {totalGasUsed && (
                                <span className="table-cell-supporting-label-color text-body-sm">
                                    IOTA
                                </span>
                            )}
                        </div>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Txns',
            accessorKey: 'transaction.data.transaction',
            cell: ({ getValue }) => {
                const transaction = getValue<IotaTransactionBlockKind>();
                const txns =
                    transaction.kind === 'ProgrammableTransaction'
                        ? transaction.transactions.length.toString()
                        : '--';
                return (
                    <TableCellBase>
                        <TableCellText>{txns}</TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Time',
            accessorKey: 'timestampMs',
            cell: ({ getValue }) => {
                const timestampMs = getValue();
                return (
                    <TableCellBase>
                        <TableCellText>
                            {timestampMs ? (
                                <DateDisplay timestamp={Number(timestampMs)} type="table" />
                            ) : (
                                '--'
                            )}
                        </TableCellText>
                    </TableCellBase>
                );
            },
        },
    ];
}
