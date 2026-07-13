// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Badge, BadgeType, ButtonUnstyled, KeyValueInfo } from '@iota/apps-ui-kit';
import { CoinFiatValue, useFormatCoin, type GasSummaryType } from '@iota/core';
import type { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { formatAddress, formatDigest } from '@iota/iota-sdk/utils';
import {
    AddressLink,
    CheckpointSequenceLink,
    DateDisplay,
    EpochLink,
    ObjectLink,
} from '~/components';
import { useBreakpoint } from '~/hooks';
import { onCopySuccess } from '~/lib/utils';

interface TransactionOverviewProps {
    transaction: IotaTransactionBlockResponse;
    gasSummary?: GasSummaryType;
}

export function TransactionOverview({
    transaction,
    gasSummary,
}: TransactionOverviewProps): JSX.Element {
    const [showAllGasPayment, setShowAllGasPayment] = useState(false);
    const isMediumOrAbove = useBreakpoint('md');

    const transactionKindName = transaction.transaction?.data.transaction?.kind;
    const sender = transaction.transaction?.data.sender;
    const signatures = transaction.transaction?.txSignatures;
    const totalGas = gasSummary?.totalGas;
    const gasBudget = gasSummary?.budget;
    const gasPayment = gasSummary?.payment;
    const gasOwner = gasSummary?.owner;

    const [formattedTotalGas, totalGasSymbol] = useFormatCoin({ balance: totalGas });
    const [formattedBudget, budgetSymbol] = useFormatCoin({ balance: gasBudget });

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
                        <CoinFiatValue
                            amount={totalGas ?? 0}
                            withParentheses={false}
                            className=""
                        />
                    }
                    fullwidth={!isMediumOrAbove}
                />
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
                        <div className="flex flex-col gap-y-xxs">
                            {signatures.map((signature) => (
                                <span key={signature} className="break-all">
                                    {formatDigest(signature)}
                                </span>
                            ))}
                        </div>
                    }
                    copyText={signatures.length === 1 ? signatures[0] : undefined}
                    onCopySuccess={onCopySuccess}
                    fullwidth={!isMediumOrAbove}
                />
            )}
        </div>
    );
}
