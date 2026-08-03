// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    formatBalanceToUSD,
    getTotalGasUsed,
    getTransactionAction,
    useBalanceInUSD,
    TransactionIcon,
    TransactionIconSize,
    ACTION_LABELS,
} from '@iota/core';
import { useIotaClientContext } from '@iota/dapp-kit';
import type {
    BalanceChange,
    IotaTransactionBlockKind,
    IotaTransactionBlockResponse,
    IotaTransactionKind,
    MoveCallIotaTransaction,
    Network,
} from '@iota/iota-sdk/client';

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

/**
 * Fiat value of a signed IOTA balance change, shown below the amount (not in parentheses) for
 * both gains and losses alike. Hides amounts under half a cent to avoid a meaningless "$0.00".
 */
export function BalanceChangeFiatValue({
    amount,
}: {
    amount: bigint | string | number;
}): JSX.Element | null {
    const { network } = useIotaClientContext();
    const value = useBalanceInUSD(IOTA_TYPE_ARG, amount, network as Network);

    if (value === null || value === undefined || Math.abs(value) < 0.005) {
        return null;
    }

    return (
        <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
            {formatBalanceToUSD(Math.abs(value))}
        </span>
    );
}

/**
 * Humanized labels for non-programmable (system) transaction kinds, shown instead of the
 * generic "Transaction" label used by `ACTION_LABELS` from `@iota/core`.
 */
const SYSTEM_TRANSACTION_KIND_LABELS: Record<
    Exclude<IotaTransactionKind, 'ProgrammableTransaction'>,
    string
> = {
    SystemTransaction: 'System',
    ConsensusCommitPrologueV1: 'Consensus Commit',
    EndOfEpochTransaction: 'Epoch Change',
    Genesis: 'Genesis',
    RandomnessStateUpdate: 'Randomness Update',
};

export function getTransactionTypeLabel(
    txn: IotaTransactionBlockResponse,
    action: ReturnType<typeof getTransactionAction>,
    isSuccess: boolean,
): string {
    if (!isSuccess) {
        return 'Failed';
    }
    const kind = txn.transaction?.data.transaction.kind;
    if (kind && kind !== 'ProgrammableTransaction') {
        return SYSTEM_TRANSACTION_KIND_LABELS[kind];
    }
    return ACTION_LABELS[action];
}

/**
 * The last Move call in a programmable transaction block, if any (e.g. `request_add_stake` on
 * the staking package). Transactions with no Move call (plain transfers) have none.
 */
export function getLastMoveCall(
    txn: IotaTransactionBlockResponse,
): MoveCallIotaTransaction | undefined {
    const transaction = txn.transaction?.data.transaction;
    if (transaction?.kind !== 'ProgrammableTransaction') {
        return undefined;
    }
    const moveCalls = transaction.transactions
        .filter(
            (command): command is { MoveCall: MoveCallIotaTransaction } => 'MoveCall' in command,
        )
        .map((command) => command.MoveCall);
    return moveCalls.at(-1);
}

/**
 * Text color classes for a signed balance/amount: positive (received) vs. negative (sent).
 */
export function getBalanceChangeColorClass(isPositive: boolean): string {
    return isPositive
        ? 'text-iota-tertiary-40 dark:text-iota-tertiary-90'
        : 'text-iota-error-30 dark:text-iota-error-80';
}

/**
 * Find the IOTA balance change for a given address in a transaction, if any.
 */
export function getIotaBalanceChangeForAddress(
    txn: IotaTransactionBlockResponse,
    address: string,
): BalanceChange | undefined {
    const balanceChanges = txn.balanceChanges;
    return balanceChanges?.find(
        (change) =>
            change.owner &&
            typeof change.owner === 'object' &&
            'AddressOwner' in change.owner &&
            change.owner.AddressOwner === address &&
            change.coinType === IOTA_TYPE_ARG,
    );
}

/**
 * Generate table columns renderers for the transactions data.
 */
export function generateTransactionsTableColumns(
    address?: string,
): ColumnDef<IotaTransactionBlockResponse>[] {
    const columns: ColumnDef<IotaTransactionBlockResponse>[] = [
        {
            header: 'Type',
            accessorKey: 'Type',
            cell: ({ row }) => {
                const txn = row.original;
                const digest = txn.digest;
                const actionAddress = address ?? txn.transaction?.data.sender;
                const isSuccess = txn.effects?.status.status === 'success';
                const action = getTransactionAction(txn, actionAddress);
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
            header: 'Sender',
            accessorKey: 'transaction.data.sender',
            meta: { tooltip: 'The address that signed and submitted this transaction.' },
            cell: ({ getValue }) => {
                const address = getValue<string>();
                return (
                    <TableCellBase>
                        <AddressLink
                            address={address}
                            copyText={address}
                            className="[&>div]:max-w-[200px] [&>div]:truncate"
                            hideAlias
                            showValidatorImage
                        />
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
    ];

    if (address) {
        columns.push({
            header: 'Balance Change',
            accessorKey: 'balanceChanges',
            cell: ({ row }) => {
                const balanceChange = getIotaBalanceChangeForAddress(row.original, address);
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
                            <TableCellText supportingLabel="IOTA">
                                <span className={getBalanceChangeColorClass(isPositive)}>
                                    {sign + formatted}
                                </span>
                            </TableCellText>
                            <BalanceChangeFiatValue amount={amount} />
                        </div>
                    </TableCellBase>
                );
            },
        });
    }

    columns.push(
        {
            header: 'Gas',
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
    );

    return columns;
}
