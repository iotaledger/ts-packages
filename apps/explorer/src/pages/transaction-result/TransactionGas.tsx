// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode, useId, useMemo, useState } from 'react';
import {
    ButtonUnstyled,
    DisplayStats,
    DisplayStatsSize,
    DisplayStatsType,
    Table,
    TableBody,
    TableCellBase,
    TableCellText,
    TableRow,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { useFormatCoin, type GasSummaryType } from '@iota/core';
import { ArrowDown } from '@iota/apps-ui-icons';
import type { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { CoinFormat, formatAddress } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import { AddressLink, CollapsibleCard, ObjectLink } from '~/components';
import { ExpandableDetails } from './TransactionOverview';

interface GasDetailsTableRow {
    field: string;
    value: ReactNode;
}

interface GasStatValueProps {
    formattedAmount: string;
    symbol: string;
    amount: bigint | number | string;
    burnedAmount?: bigint | number | string;
    formattedBurnedAmount?: string;
    burnedSymbol?: string;
}

function GasStatValue({
    formattedAmount,
    symbol,
    amount,
    burnedAmount,
    formattedBurnedAmount,
    burnedSymbol,
}: GasStatValueProps): JSX.Element {
    return (
        <div className="flex flex-col gap-xxxs">
            <span>
                {formattedAmount} {symbol}
            </span>
            <span className="text-body-sm font-normal text-iota-neutral-40 dark:text-iota-neutral-60">
                {BigInt(amount).toLocaleString()} (nano)
            </span>
            {!!burnedAmount && (
                <span className="text-body-sm font-normal text-iota-neutral-40 dark:text-iota-neutral-60">
                    Burnt: {formattedBurnedAmount} {burnedSymbol} (
                    {BigInt(burnedAmount).toLocaleString()} nano)
                </span>
            )}
        </div>
    );
}

interface GasFeeAmountProps {
    amount?: bigint | number | string;
    burnedAmount?: bigint | number | string;
}

function GasFeeAmount({ amount, burnedAmount }: GasFeeAmountProps): JSX.Element | null {
    const [formattedAmount, symbol] = useFormatCoin({ balance: amount, format: CoinFormat.Full });
    const [formattedBurnedAmount, burnedSymbol] = useFormatCoin({
        balance: burnedAmount,
        format: CoinFormat.Full,
    });

    if (!amount) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-baseline gap-xxs">
            <span>
                {formattedAmount} {symbol}
            </span>
            <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                {BigInt(amount).toLocaleString()} (nano)
            </span>
            {!!burnedAmount && (
                <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                    Burnt: {formattedBurnedAmount} {burnedSymbol} (
                    {BigInt(burnedAmount).toLocaleString()} nano)
                </span>
            )}
        </div>
    );
}

interface GasPaymentObjectsSummaryProps {
    payments: Array<{ objectId: string }>;
    showAll: boolean;
    onToggle: () => void;
    detailsId: string;
}

function GasPaymentObjectsSummary({
    payments,
    showAll,
    onToggle,
    detailsId,
}: GasPaymentObjectsSummaryProps): JSX.Element {
    const hasMorePayments = payments.length > 2;

    return (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-x-sm gap-y-xxs">
            {!showAll &&
                payments
                    .slice(0, 2)
                    .map((payment) => (
                        <ObjectLink
                            key={payment.objectId}
                            objectId={payment.objectId}
                            label={formatAddress(payment.objectId)}
                            copyText={payment.objectId}
                        />
                    ))}
            {hasMorePayments && (
                <ButtonUnstyled
                    className="inline-flex items-center gap-xxxs text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                    aria-controls={detailsId}
                    aria-expanded={showAll}
                    onClick={onToggle}
                >
                    {showAll ? 'Show Less' : `Show ${payments.length - 2} More`}
                    <ArrowDown
                        className={clsx(
                            'h-4 w-4 transition-transform ease-linear',
                            showAll && 'rotate-180',
                        )}
                    />
                </ButtonUnstyled>
            )}
        </div>
    );
}

interface GasPaymentObjectsDetailsProps {
    payments: Array<{ objectId: string }>;
    detailsId: string;
}

function GasPaymentObjectsDetails({
    payments,
    detailsId,
}: GasPaymentObjectsDetailsProps): JSX.Element {
    return (
        <ExpandableDetails id={detailsId} ariaLabel="Gas payment object details">
            <div className="flex items-center justify-between gap-sm text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                <span className="shrink-0">Objects</span>
                <span className="shrink-0">
                    {payments.length} Gas Object{payments.length === 1 ? '' : 's'}
                </span>
            </div>
            <div className="flex max-h-64 flex-col overflow-y-auto pr-xxs">
                {payments.map((payment, index) => (
                    <div
                        key={payment.objectId}
                        className={clsx(
                            'min-w-0 py-xs',
                            index > 0 &&
                                'border-t border-iota-neutral-92 dark:border-iota-neutral-12',
                        )}
                    >
                        <div className="flex max-w-full justify-start overflow-x-auto">
                            <div className="min-w-max">
                                <ObjectLink
                                    objectId={payment.objectId}
                                    noTruncate
                                    copyText={payment.objectId}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ExpandableDetails>
    );
}

interface TransactionGasProps {
    transaction: IotaTransactionBlockResponse;
    gasSummary?: GasSummaryType;
}

export function TransactionGas({ transaction, gasSummary }: TransactionGasProps): JSX.Element {
    const [showAllGasPayment, setShowAllGasPayment] = useState(false);
    const gasPaymentDetailsId = `gas-payment-objects-${useId().replace(/:/g, '')}`;

    const transactionKindName = transaction.transaction?.data.transaction?.kind;
    const isProgrammableTransaction = transactionKindName === 'ProgrammableTransaction';
    const totalGas = gasSummary?.totalGas;
    const gasBudget = gasSummary?.budget;
    const gasPayment = gasSummary?.payment;
    const gasOwner = gasSummary?.owner;
    const gasPrice = gasSummary?.price;
    const gasUsed = gasSummary?.gasUsed;

    const [formattedTotalGas, totalGasSymbol] = useFormatCoin({
        balance: totalGas,
        format: CoinFormat.Full,
    });
    const [formattedBudget, budgetSymbol] = useFormatCoin({
        balance: gasBudget,
        format: CoinFormat.Full,
    });
    const [formattedComputation, computationSymbol] = useFormatCoin({
        balance: gasUsed?.computationCost,
        format: CoinFormat.Full,
    });
    const [formattedBurnedComputation, burnedComputationSymbol] = useFormatCoin({
        balance: gasUsed?.computationCostBurned,
        format: CoinFormat.Full,
    });
    const [formattedStorage, storageSymbol] = useFormatCoin({
        balance: gasUsed?.storageCost,
        format: CoinFormat.Full,
    });
    const [formattedRebate, rebateSymbol] = useFormatCoin({
        balance: gasUsed?.storageRebate ? -Number(gasUsed.storageRebate) : undefined,
        format: CoinFormat.Full,
    });

    const detailsRows = useMemo<GasDetailsTableRow[]>(() => {
        const rows: GasDetailsTableRow[] = [];
        if (isProgrammableTransaction && gasPrice) {
            rows.push({ field: 'Gas Price', value: <GasFeeAmount amount={gasPrice} /> });
        }
        if (isProgrammableTransaction && gasBudget) {
            rows.push({
                field: 'Gas Budget',
                value: `${formattedBudget} ${budgetSymbol}`,
            });
        }
        if (isProgrammableTransaction && gasPayment?.length) {
            rows.push({
                field: 'Gas Payment Objects',
                value: (
                    <div className="flex flex-col gap-xs">
                        <GasPaymentObjectsSummary
                            payments={gasPayment}
                            showAll={showAllGasPayment}
                            detailsId={gasPaymentDetailsId}
                            onToggle={() => setShowAllGasPayment(!showAllGasPayment)}
                        />
                        {showAllGasPayment && (
                            <GasPaymentObjectsDetails
                                payments={gasPayment}
                                detailsId={gasPaymentDetailsId}
                            />
                        )}
                    </div>
                ),
            });
        }
        if (isProgrammableTransaction && gasOwner) {
            rows.push({
                field: 'Gas Object Owner',
                value: <AddressLink address={gasOwner} copyText={gasOwner} />,
            });
        }
        return rows;
    }, [
        isProgrammableTransaction,
        gasPrice,
        gasBudget,
        formattedBudget,
        budgetSymbol,
        gasPayment,
        showAllGasPayment,
        gasPaymentDetailsId,
        gasOwner,
    ]);

    return (
        <CollapsibleCard
            title="Gas"
            hideBorder
            rawData={{
                gasData: transaction.transaction?.data.gasData,
                gasUsed: transaction.effects?.gasUsed,
                gasObject: transaction.effects?.gasObject,
            }}
        >
            <div className="flex w-full flex-col gap-md pb-md--rs">
                {isProgrammableTransaction && gasUsed && (
                    <div
                        data-testid="gas-breakdown"
                        className="grid grid-cols-2 gap-md--rs px-md--rs sm:grid-cols-4"
                    >
                        {totalGas && (
                            <DisplayStats
                                label="Total Gas Fee"
                                tooltipText="Computation cost plus storage cost, minus any storage rebate."
                                tooltipPosition={TooltipPosition.Top}
                                value={
                                    <GasStatValue
                                        formattedAmount={formattedTotalGas}
                                        symbol={totalGasSymbol}
                                        amount={totalGas}
                                    />
                                }
                                type={DisplayStatsType.Secondary}
                                size={DisplayStatsSize.Default}
                            />
                        )}
                        {gasUsed.computationCost && (
                            <DisplayStats
                                label="Computation Fee"
                                tooltipText="Fee for executing the transaction's logic (CPU). Part of it is burned (removed from supply)."
                                tooltipPosition={TooltipPosition.Top}
                                value={
                                    <GasStatValue
                                        formattedAmount={formattedComputation}
                                        symbol={computationSymbol}
                                        amount={gasUsed.computationCost}
                                        burnedAmount={gasUsed.computationCostBurned}
                                        formattedBurnedAmount={formattedBurnedComputation}
                                        burnedSymbol={burnedComputationSymbol}
                                    />
                                }
                                size={DisplayStatsSize.Default}
                            />
                        )}
                        {gasUsed.storageCost && (
                            <DisplayStats
                                label="Storage Fee"
                                tooltipText="A deposit paid for the bytes this transaction stores on-chain. It is refunded later (as storage rebate) when the data is deleted or rewritten."
                                tooltipPosition={TooltipPosition.Top}
                                value={
                                    <GasStatValue
                                        formattedAmount={formattedStorage}
                                        symbol={storageSymbol}
                                        amount={gasUsed.storageCost}
                                    />
                                }
                                size={DisplayStatsSize.Default}
                            />
                        )}
                        {gasUsed.storageRebate && (
                            <DisplayStats
                                label="Storage Rebate"
                                tooltipText="Deposit returned to the sender for on-chain data this transaction deleted or replaced."
                                tooltipPosition={TooltipPosition.Top}
                                value={
                                    <GasStatValue
                                        formattedAmount={formattedRebate}
                                        symbol={rebateSymbol}
                                        amount={-Number(gasUsed.storageRebate)}
                                    />
                                }
                                size={DisplayStatsSize.Default}
                            />
                        )}
                    </div>
                )}
                {!!detailsRows.length && (
                    <div className="px-md--rs">
                        <Table rowIndexes={detailsRows.map((_, index) => index)}>
                            <TableBody>
                                {detailsRows.map((row, index) => (
                                    <TableRow key={index}>
                                        <TableCellBase>
                                            <TableCellText>{row.field}</TableCellText>
                                        </TableCellBase>
                                        <TableCellBase>{row.value}</TableCellBase>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </CollapsibleCard>
    );
}
