// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { InfoBox, InfoBoxStyle, InfoBoxType } from '@iota/apps-ui-kit';
import { CheckmarkFilled, Close } from '@iota/apps-ui-icons';
import type { useTransactionSummary } from '../../hooks';
import { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { STAKING_REQUEST_EVENT, UNSTAKING_REQUEST_EVENT } from '../../constants';
import { StakeTransactionDetails } from './details';
import { UnstakeTransactionInfo } from './info';
import { TransactionSummary } from './summary';
import { RenderExplorerLink } from '../../types';
import { GasFees } from '../gas';
import { formatDate } from '../../utils';

interface TransactionReceiptProps {
    txn: IotaTransactionBlockResponse;
    activeAddress: string | null;
    summary: Exclude<ReturnType<typeof useTransactionSummary>, null>;
    renderExplorerLink: RenderExplorerLink;
    stickyStatus?: boolean;
}

export function TransactionReceipt({
    txn,
    activeAddress,
    summary,
    renderExplorerLink,
    stickyStatus,
}: TransactionReceiptProps) {
    const { events } = txn;

    const isSender = txn.transaction?.data.sender === activeAddress;
    const isSuccess = summary.status === 'success';

    const stakeTypeTransaction = events?.find(({ type }) => type === STAKING_REQUEST_EVENT);
    const unstakeTypeTransaction = events?.find(({ type }) => type === UNSTAKING_REQUEST_EVENT);

    const content =
        stakeTypeTransaction || unstakeTypeTransaction ? (
            <>
                {stakeTypeTransaction ? (
                    <StakeTransactionDetails
                        activeAddress={activeAddress}
                        events={events ?? []}
                        gasSummary={summary?.gas}
                        renderExplorerLink={renderExplorerLink}
                    />
                ) : null}
                {unstakeTypeTransaction ? (
                    <UnstakeTransactionInfo
                        activeAddress={activeAddress}
                        events={events ?? []}
                        gasSummary={summary?.gas}
                        renderExplorerLink={renderExplorerLink}
                    />
                ) : null}
            </>
        ) : (
            <>
                <TransactionSummary summary={summary} renderExplorerLink={renderExplorerLink} />
                {isSender && (
                    <GasFees
                        gasSummary={summary?.gas}
                        renderExplorerLink={renderExplorerLink}
                        activeAddress={activeAddress}
                    />
                )}
            </>
        );

    const status = (
        <TransactionStatus
            success={isSuccess}
            timestamp={txn.timestampMs ?? undefined}
            isIncoming={!isSender}
        />
    );

    if (stickyStatus) {
        return (
            <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex min-h-0 flex-1 flex-col gap-md overflow-x-hidden overflow-y-auto">
                    {content}
                </div>
                {status}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-md overflow-x-hidden overflow-y-auto">
            {status}
            {content}
        </div>
    );
}

interface TransactionStatusProps {
    success: boolean;
    timestamp?: string;
    isIncoming?: boolean;
}

function TransactionStatus({ success, timestamp, isIncoming }: TransactionStatusProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const txnDate = timestamp
        ? formatDate(Number(timestamp), ['day', 'month', 'year', 'hour', 'minute'])
        : '';
    const successMessage = isIncoming ? 'Successfully received' : 'Successfully sent';

    return (
        <div className="relative">
            <InfoBox
                type={success ? InfoBoxType.Success : InfoBoxType.Error}
                style={InfoBoxStyle.Elevated}
                title={success ? successMessage : 'Transaction failed'}
                supportingText={txnDate}
                icon={<CheckmarkFilled />}
            />
            <button
                onClick={() => setDismissed(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-xs text-iota-neutral-40 hover:text-iota-neutral-10 dark:text-iota-neutral-60 dark:hover:text-iota-neutral-92"
                aria-label="Dismiss"
            >
                <Close className="h-4 w-4" />
            </button>
        </div>
    );
}
