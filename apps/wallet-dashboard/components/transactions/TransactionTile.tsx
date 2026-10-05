// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { useMemo, useState } from 'react';
import {
    Card,
    CardType,
    CardImage,
    ImageType,
    ImageShape,
    CardBody,
    CardAction,
    CardActionType,
    Dialog,
} from '@iota/apps-ui-kit';
import {
    getTransactionAction,
    TransactionIcon,
    checkIfIsTimelockedStaking,
    getTransactionAmountForTimelocked,
    formatDate,
    isMigrationTransaction,
    CoinAmountChange,
    getCoinChangesForAddress,
    getTransactionCoinBalances,
    TransactionCoinAmounts,
} from '@iota/core';
import { useCurrentAccount } from '@iota/dapp-kit';
import { TransactionDetailsLayout } from '../dialogs/transaction/TransactionDetailsLayout';
import { DialogLayout } from '../dialogs/layout';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';

interface TransactionTileProps {
    transaction: IotaTransactionBlockResponse;
    hideBalance?: boolean;
}

export function TransactionTile({ transaction, hideBalance }: TransactionTileProps): JSX.Element {
    const account = useCurrentAccount();
    const address = account?.address ?? '';
    const [open, setOpen] = useState(false);

    const { isTimelockedStaking, isTimelockedUnstaking } = checkIfIsTimelockedStaking(
        transaction?.events,
    );

    const txnFailed = transaction.effects?.status.status !== 'success';
    const label = getTransactionAction(transaction, address);

    const changes = useMemo((): CoinAmountChange[] => {
        if ((isTimelockedStaking || isTimelockedUnstaking) && transaction.events) {
            const amount = getTransactionAmountForTimelocked(
                transaction.events,
                isTimelockedStaking,
                isTimelockedUnstaking,
            );
            return [{ coinType: IOTA_TYPE_ARG, amount: BigInt(amount ?? 0) }];
        }
        const addressChanges = getCoinChangesForAddress(
            getTransactionCoinBalances(transaction),
            address,
        );
        if (isMigrationTransaction(transaction.transaction)) {
            return addressChanges.filter(({ coinType }) => coinType === IOTA_TYPE_ARG);
        }
        return addressChanges;
    }, [transaction, address, isTimelockedStaking, isTimelockedUnstaking]);

    function openDetailsDialog() {
        setOpen(true);
    }

    const transactionDate =
        transaction.timestampMs &&
        formatDate(Number(transaction.timestampMs), ['day', 'month', 'year', 'hour', 'minute']);

    return (
        <>
            <Card
                testId="transaction-tile"
                type={CardType.Default}
                isHoverable
                onClick={openDetailsDialog}
                aria-label={`View ${label ?? 'transaction'} details`}
            >
                <CardImage type={ImageType.BgSolid} shape={ImageShape.SquareRounded}>
                    <TransactionIcon variant={label} txnFailed={txnFailed} />
                </CardImage>
                <CardBody
                    title={txnFailed ? `Failed - ${label ?? 'Unknown'}` : (label ?? 'Unknown')}
                    subtitle={transactionDate}
                />
                <CardAction
                    type={CardActionType.SupportingText}
                    title={
                        txnFailed || changes.length === 0 ? (
                            '--'
                        ) : (
                            <TransactionCoinAmounts changes={changes} hideBalance={hideBalance} />
                        )
                    }
                />
            </Card>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogLayout>
                    <TransactionDetailsLayout
                        transaction={transaction}
                        onClose={() => setOpen(false)}
                    />
                </DialogLayout>
            </Dialog>
        </>
    );
}
