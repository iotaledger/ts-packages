// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    formatDate,
    getTransactionAction,
    TransactionIcon,
    checkIfIsTimelockedStaking,
    getTransactionAmountForTimelocked,
    isMigrationTransaction,
    type CoinAmountChange,
    getCoinChangesForAddress,
    getTransactionCoinBalances,
    TransactionCoinAmounts,
} from '@iota/core';
import type { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Card,
    CardType,
    CardImage,
    ImageType,
    CardBody,
    CardAction,
    CardActionType,
    ImageShape,
} from '@iota/apps-ui-kit';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';

interface TransactionCardProps {
    txn: IotaTransactionBlockResponse;
    address: string;
}

export function TransactionCard({ txn, address }: TransactionCardProps) {
    const executionStatus = txn.effects?.status.status;
    const { isTimelockedStaking, isTimelockedUnstaking } = checkIfIsTimelockedStaking(txn.events);

    const changes = useMemo((): CoinAmountChange[] => {
        if ((isTimelockedStaking || isTimelockedUnstaking) && txn.events) {
            const amount = getTransactionAmountForTimelocked(
                txn.events,
                isTimelockedStaking,
                isTimelockedUnstaking,
            );
            return [{ coinType: IOTA_TYPE_ARG, amount: BigInt(amount ?? 0) }];
        }
        const addressChanges = getCoinChangesForAddress(getTransactionCoinBalances(txn), address);
        if (isMigrationTransaction(txn.transaction)) {
            return addressChanges.filter(({ coinType }) => coinType === IOTA_TYPE_ARG);
        }
        return addressChanges;
    }, [txn, address, isTimelockedStaking, isTimelockedUnstaking]);

    const error = txn.effects?.status.error;

    const transactionDate = !txn.timestampMs
        ? '--'
        : formatDate(Number(txn.timestampMs), ['day', 'month', 'year', 'hour', 'minute']);

    const transactionAction = getTransactionAction(txn, address);
    const isTransactionSuccess = executionStatus === 'success' && !error;

    return (
        <Link
            data-testid="link-to-txn"
            to={`/receipt?${new URLSearchParams({
                txdigest: txn.digest,
            }).toString()}`}
            className="flex w-full flex-col items-center no-underline"
        >
            <Card type={CardType.Default} isHoverable>
                <CardImage type={ImageType.BgSolid} shape={ImageShape.SquareRounded}>
                    <TransactionIcon
                        variant={transactionAction}
                        txnFailed={!isTransactionSuccess}
                    />
                </CardImage>
                <CardBody
                    title={error ? `Failed - ${transactionAction}` : transactionAction}
                    subtitle={transactionDate}
                />
                <CardAction
                    type={CardActionType.SupportingText}
                    title={
                        error || changes.length === 0 ? (
                            '--'
                        ) : (
                            <TransactionCoinAmounts changes={changes} />
                        )
                    }
                />
            </Card>
        </Link>
    );
}
