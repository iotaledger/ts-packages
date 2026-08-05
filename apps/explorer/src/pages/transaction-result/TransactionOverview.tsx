// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import {
    Badge,
    BadgeType,
    ButtonUnstyled,
    Divider,
    KeyColumnWidth,
    KeyValueInfo,
} from '@iota/apps-ui-kit';
import {
    CoinFiatValue,
    TransactionAction,
    getTransactionAction,
    useFormatCoin,
    type GasSummaryType,
} from '@iota/core';
import { ArrowBottomLeft, ArrowDown, ArrowTopRight } from '@iota/apps-ui-icons';
import type { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { CoinFormat, formatAddress, toBase64 } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import {
    AddressLink,
    CheckpointSequenceLink,
    DateDisplay,
    EpochLink,
    ObjectLink,
} from '~/components';
import { useDeserializedSignatures, type SignaturePubkeyPair } from '~/hooks';
import { getSendRecipientAddress, onCopySuccess } from '~/lib/utils';

// A fixed-width, invisible spacer passed as `KeyValueInfo`'s `keyIcon` to indent the key
// text without changing the row's width (which would misalign the value column).
const INDENT_SPACER = <span aria-hidden className="inline-block w-sm--rs" />;

// Draws a single continuous vertical rule alongside indented rows, instead of each
// row drawing its own border (which leaves visible gaps between rows).
function IndentGuide({ children }: { children: React.ReactNode }): JSX.Element {
    return (
        <div className="relative flex flex-col gap-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 border-l border-iota-neutral-92 dark:border-iota-neutral-12" />
            {children}
        </div>
    );
}

function SignatureBreakdown({ signature: data }: { signature: SignaturePubkeyPair }): JSX.Element {
    const { signature, signatureScheme } = data;
    return (
        <IndentGuide>
            <KeyValueInfo
                keyColumnWidth={KeyColumnWidth.Wide}
                keyIcon={INDENT_SPACER}
                keyText="Scheme"
                value={signatureScheme}
            />
            <KeyValueInfo
                keyColumnWidth={KeyColumnWidth.Wide}
                keyIcon={INDENT_SPACER}
                keyText="Address"
                value={
                    <AddressLink
                        address={'address' in data ? data.address : data.publicKey.toIotaAddress()}
                        copyText={'address' in data ? data.address : data.publicKey.toIotaAddress()}
                    />
                }
            />
            {'publicKey' in data ? (
                <KeyValueInfo
                    keyColumnWidth={KeyColumnWidth.Wide}
                    keyIcon={INDENT_SPACER}
                    keyText="IOTA Public Key"
                    value={data.publicKey.toIotaPublicKey()}
                    copyText={data.publicKey.toIotaPublicKey()}
                    onCopySuccess={onCopySuccess}
                    isTruncated
                />
            ) : null}
            <KeyValueInfo
                keyColumnWidth={KeyColumnWidth.Wide}
                keyIcon={INDENT_SPACER}
                keyText="Signature"
                copyText={toBase64(signature)}
                onCopySuccess={onCopySuccess}
                value={toBase64(signature)}
                isTruncated
            />
        </IndentGuide>
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

interface TransactionOverviewProps {
    transaction: IotaTransactionBlockResponse;
    gasSummary?: GasSummaryType;
}

export function TransactionOverview({
    transaction,
    gasSummary,
}: TransactionOverviewProps): JSX.Element {
    const [showAllGasPayment, setShowAllGasPayment] = useState(false);
    const [showGasFeeBreakdown, setShowGasFeeBreakdown] = useState(false);
    const [showFullSignatures, setShowFullSignatures] = useState(false);
    const { userSignatures, sponsorSignature } = useDeserializedSignatures(transaction);

    const transactionKindName = transaction.transaction?.data.transaction?.kind;
    const isProgrammableTransaction = transactionKindName === 'ProgrammableTransaction';
    const sender = transaction.transaction?.data.sender;
    const signatures = transaction.transaction?.txSignatures;
    const action = getTransactionAction(transaction, sender);
    const recipient =
        action === TransactionAction.Send
            ? getSendRecipientAddress(transaction, sender)
            : undefined;
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

    return (
        <div className="flex flex-col gap-sm p-md--rs md:max-w-4xl">
            {transactionKindName && (
                <KeyValueInfo
                    keyColumnWidth={KeyColumnWidth.Wide}
                    keyText="Transaction Type"
                    value={
                        <div className="whitespace-nowrap">
                            <Badge label={transactionKindName} type={BadgeType.PrimarySoft} />
                        </div>
                    }
                />
            )}
            <KeyValueInfo
                keyColumnWidth={KeyColumnWidth.Wide}
                keyText="Digest"
                value={transaction.digest}
                copyText={transaction.digest}
                onCopySuccess={onCopySuccess}
                isTruncated
            />
            {transaction.checkpoint && (
                <KeyValueInfo
                    keyColumnWidth={KeyColumnWidth.Wide}
                    keyText="Checkpoint"
                    value={
                        <CheckpointSequenceLink sequence={transaction.checkpoint}>
                            {Number(transaction.checkpoint).toLocaleString()}
                        </CheckpointSequenceLink>
                    }
                    copyText={transaction.checkpoint}
                    onCopySuccess={onCopySuccess}
                />
            )}
            {transaction.effects?.executedEpoch && (
                <KeyValueInfo
                    keyColumnWidth={KeyColumnWidth.Wide}
                    keyText="Epoch"
                    value={
                        <EpochLink epoch={transaction.effects.executedEpoch}>
                            {transaction.effects.executedEpoch}
                        </EpochLink>
                    }
                />
            )}
            {transaction.timestampMs && (
                <KeyValueInfo
                    keyColumnWidth={KeyColumnWidth.Wide}
                    keyText="Timestamp"
                    value={
                        <DateDisplay
                            timestamp={transaction.timestampMs}
                            type="transaction"
                            showTimeAgo
                        />
                    }
                />
            )}
            {sender && (
                <KeyValueInfo
                    keyColumnWidth={KeyColumnWidth.Wide}
                    keyText="Sender"
                    keyIcon={
                        <ArrowTopRight className="h-4 w-4 shrink-0 text-iota-neutral-40 dark:text-iota-neutral-60" />
                    }
                    value={<AddressLink address={sender} />}
                    copyText={sender}
                    onCopySuccess={onCopySuccess}
                />
            )}
            {recipient && (
                <KeyValueInfo
                    keyColumnWidth={KeyColumnWidth.Wide}
                    keyText="Recipient"
                    keyIcon={
                        <ArrowBottomLeft className="h-4 w-4 shrink-0 text-iota-neutral-40 dark:text-iota-neutral-60" />
                    }
                    value={<AddressLink address={recipient} />}
                    copyText={recipient}
                    onCopySuccess={onCopySuccess}
                />
            )}
            {isProgrammableTransaction && totalGas && (
                <div data-testid="gas-breakdown">
                    <KeyValueInfo
                        keyColumnWidth={KeyColumnWidth.Wide}
                        keyText="Total Gas Fee"
                        value={
                            <div className="flex flex-col gap-xxs md:flex-row md:items-baseline md:gap-xs">
                                <div className="flex flex-row items-baseline gap-xs">
                                    <span>
                                        {formattedTotalGas} {totalGasSymbol}
                                    </span>
                                    <CoinFiatValue amount={totalGas ?? 0} withParentheses={false} />
                                </div>
                                {gasUsed && (
                                    <ButtonUnstyled
                                        className="flex flex-row items-center gap-xxxs text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                                        onClick={() => setShowGasFeeBreakdown(!showGasFeeBreakdown)}
                                    >
                                        {showGasFeeBreakdown ? 'Show Less' : 'Show More'}
                                        <ArrowDown
                                            className={clsx(
                                                'h-4 w-4 transition-transform ease-linear',
                                                showGasFeeBreakdown && 'rotate-180',
                                            )}
                                        />
                                    </ButtonUnstyled>
                                )}
                            </div>
                        }
                    />
                </div>
            )}
            {isProgrammableTransaction && showGasFeeBreakdown && gasUsed && (
                <IndentGuide>
                    {gasPrice && (
                        <KeyValueInfo
                            keyColumnWidth={KeyColumnWidth.Wide}
                            keyIcon={INDENT_SPACER}
                            keyText="Gas Price"
                            value={<GasFeeAmount amount={gasPrice} />}
                        />
                    )}
                    {gasUsed.computationCost && (
                        <KeyValueInfo
                            keyColumnWidth={KeyColumnWidth.Wide}
                            keyIcon={INDENT_SPACER}
                            keyText="Computation Fee"
                            value={
                                <GasFeeAmount
                                    amount={gasUsed.computationCost}
                                    burnedAmount={gasUsed.computationCostBurned}
                                />
                            }
                        />
                    )}
                    {gasUsed.storageCost && (
                        <KeyValueInfo
                            keyColumnWidth={KeyColumnWidth.Wide}
                            keyIcon={INDENT_SPACER}
                            keyText="Storage Fee"
                            value={<GasFeeAmount amount={gasUsed.storageCost} />}
                        />
                    )}
                    {gasUsed.storageRebate && (
                        <KeyValueInfo
                            keyColumnWidth={KeyColumnWidth.Wide}
                            keyIcon={INDENT_SPACER}
                            keyText="Storage Rebate"
                            value={<GasFeeAmount amount={-Number(gasUsed.storageRebate)} />}
                        />
                    )}
                </IndentGuide>
            )}
            {isProgrammableTransaction && gasBudget && (
                <KeyValueInfo
                    keyColumnWidth={KeyColumnWidth.Wide}
                    keyText="Gas Budget"
                    value={`${formattedBudget} ${budgetSymbol}`}
                />
            )}
            {isProgrammableTransaction && !!gasPayment?.length && (
                <KeyValueInfo
                    keyColumnWidth={KeyColumnWidth.Wide}
                    keyText="Gas Payment Objects"
                    value={
                        <div className="flex flex-wrap gap-x-sm gap-y-xxs">
                            {(showAllGasPayment ? gasPayment : gasPayment.slice(0, 3)).map(
                                (payment) => (
                                    <ObjectLink
                                        key={payment.objectId}
                                        objectId={payment.objectId}
                                        label={formatAddress(payment.objectId)}
                                        copyText={payment.objectId}
                                    />
                                ),
                            )}
                            {gasPayment.length > 3 && (
                                <ButtonUnstyled
                                    className="text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                                    onClick={() => setShowAllGasPayment(!showAllGasPayment)}
                                >
                                    {showAllGasPayment
                                        ? 'Show Less'
                                        : `Show More (${gasPayment.length - 3})`}
                                </ButtonUnstyled>
                            )}
                        </div>
                    }
                />
            )}
            {isProgrammableTransaction && gasOwner && (
                <KeyValueInfo
                    keyColumnWidth={KeyColumnWidth.Wide}
                    keyText="Gas Object Owner"
                    value={<AddressLink address={gasOwner} />}
                    copyText={gasOwner}
                    onCopySuccess={onCopySuccess}
                />
            )}
            {!!signatures?.length && (
                <KeyValueInfo
                    keyColumnWidth={KeyColumnWidth.Wide}
                    keyText={signatures.length > 1 ? 'User Signatures' : 'User Signature'}
                    value={
                        <ButtonUnstyled
                            className="flex flex-row items-center gap-xxxs text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                            onClick={() => setShowFullSignatures(!showFullSignatures)}
                        >
                            {showFullSignatures ? 'Show Less' : 'Show More'}
                            <ArrowDown
                                className={clsx(
                                    'h-4 w-4 transition-transform ease-linear',
                                    showFullSignatures && 'rotate-180',
                                )}
                            />
                        </ButtonUnstyled>
                    }
                />
            )}
            {showFullSignatures && (
                <div className="flex flex-col gap-md">
                    {[...userSignatures, ...(sponsorSignature ? [sponsorSignature] : [])].map(
                        (signature, index) => (
                            <div key={index} className="flex flex-col gap-md">
                                {index > 0 && <Divider />}
                                <SignatureBreakdown signature={signature} />
                            </div>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}
