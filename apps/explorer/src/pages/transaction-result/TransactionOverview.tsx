// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Badge, BadgeType, ButtonUnstyled, KeyValueInfo } from '@iota/apps-ui-kit';
import { CoinFiatValue, useFormatCoin, type GasSummaryType } from '@iota/core';
import { ArrowDown } from '@iota/apps-ui-icons';
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
import { useBreakpoint, useDeserializedSignatures, type SignaturePubkeyPair } from '~/hooks';
import { onCopySuccess } from '~/lib/utils';

function SignatureBreakdown({ signature: data }: { signature: SignaturePubkeyPair }): JSX.Element {
    const { signature, signatureScheme } = data;
    return (
        <div className="flex flex-col gap-xs">
            <KeyValueInfo keyText="Scheme" value={signatureScheme} />
            <KeyValueInfo
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
                    keyText="IOTA Public Key"
                    value={data.publicKey.toIotaPublicKey()}
                    copyText={data.publicKey.toIotaPublicKey()}
                    onCopySuccess={onCopySuccess}
                    isTruncated
                />
            ) : null}
            <KeyValueInfo
                keyText="Signature"
                copyText={toBase64(signature)}
                onCopySuccess={onCopySuccess}
                value={toBase64(signature)}
                isTruncated
            />
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
    const isMediumOrAbove = useBreakpoint('md');
    const { userSignatures, sponsorSignature } = useDeserializedSignatures(transaction);

    const transactionKindName = transaction.transaction?.data.transaction?.kind;
    const sender = transaction.transaction?.data.sender;
    const signatures = transaction.transaction?.txSignatures;
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
                    keyText="Transaction Type"
                    value={
                        <div className="whitespace-nowrap">
                            <Badge label={transactionKindName} type={BadgeType.PrimarySoft} />
                        </div>
                    }
                    fullwidth={!isMediumOrAbove}
                />
            )}
            <KeyValueInfo
                keyText="Digest"
                value={transaction.digest}
                copyText={transaction.digest}
                onCopySuccess={onCopySuccess}
                isTruncated
                fullwidth={!isMediumOrAbove}
            />
            {transaction.checkpoint && (
                <KeyValueInfo
                    keyText="Checkpoint"
                    value={
                        <CheckpointSequenceLink sequence={transaction.checkpoint}>
                            {Number(transaction.checkpoint).toLocaleString()}
                        </CheckpointSequenceLink>
                    }
                    copyText={transaction.checkpoint}
                    onCopySuccess={onCopySuccess}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {transaction.effects?.executedEpoch && (
                <KeyValueInfo
                    keyText="Epoch"
                    value={
                        <EpochLink epoch={transaction.effects.executedEpoch}>
                            {transaction.effects.executedEpoch}
                        </EpochLink>
                    }
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {transaction.timestampMs && (
                <KeyValueInfo
                    keyText="Timestamp"
                    value={
                        <DateDisplay
                            timestamp={transaction.timestampMs}
                            type="transaction"
                            showTimeAgo
                        />
                    }
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {sender && (
                <KeyValueInfo
                    keyText="Sender"
                    value={<AddressLink address={sender} />}
                    copyText={sender}
                    onCopySuccess={onCopySuccess}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {totalGas && (
                <KeyValueInfo
                    keyText="Total Gas Fee"
                    value={`${formattedTotalGas} ${totalGasSymbol}`}
                    supportingLabel={
                        <div className="flex flex-row items-baseline gap-xs">
                            <CoinFiatValue amount={totalGas ?? 0} withParentheses={false} />
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
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {showGasFeeBreakdown && gasUsed && (
                <div className="ml-xs flex flex-col gap-xs border-l border-iota-neutral-92 py-xxs pl-sm--rs dark:border-iota-neutral-12">
                    {gasPrice && (
                        <KeyValueInfo
                            keyText="Gas Price"
                            value={<GasFeeAmount amount={gasPrice} />}
                            fullwidth={!isMediumOrAbove}
                        />
                    )}
                    {gasUsed.computationCost && (
                        <KeyValueInfo
                            keyText="Computation Fee"
                            value={
                                <GasFeeAmount
                                    amount={gasUsed.computationCost}
                                    burnedAmount={gasUsed.computationCostBurned}
                                />
                            }
                            fullwidth={!isMediumOrAbove}
                        />
                    )}
                    {gasUsed.storageCost && (
                        <KeyValueInfo
                            keyText="Storage Fee"
                            value={<GasFeeAmount amount={gasUsed.storageCost} />}
                            fullwidth={!isMediumOrAbove}
                        />
                    )}
                    {gasUsed.storageRebate && (
                        <KeyValueInfo
                            keyText="Storage Rebate"
                            value={<GasFeeAmount amount={-Number(gasUsed.storageRebate)} />}
                            fullwidth={!isMediumOrAbove}
                        />
                    )}
                </div>
            )}
            {gasBudget && (
                <KeyValueInfo
                    keyText="Gas Budget"
                    value={`${formattedBudget} ${budgetSymbol}`}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {!!gasPayment?.length && (
                <KeyValueInfo
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
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {gasOwner && (
                <KeyValueInfo
                    keyText="Gas Object Owner"
                    value={<AddressLink address={gasOwner} />}
                    copyText={gasOwner}
                    onCopySuccess={onCopySuccess}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {!!signatures?.length && (
                <KeyValueInfo
                    keyText={signatures.length > 1 ? 'User Signatures' : 'User Signature'}
                    value={
                        <div className="flex flex-col items-start gap-xs">
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
                            {showFullSignatures && (
                                <div className="flex w-full flex-col gap-md">
                                    {userSignatures.map((signature, index) => (
                                        <SignatureBreakdown key={index} signature={signature} />
                                    ))}
                                    {sponsorSignature && (
                                        <SignatureBreakdown signature={sponsorSignature} />
                                    )}
                                </div>
                            )}
                        </div>
                    }
                    fullwidth={!isMediumOrAbove}
                />
            )}
        </div>
    );
}
