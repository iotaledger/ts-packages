// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Button, ButtonSize, ButtonType } from '@iota/apps-ui-kit';
import type { useTransactionSummary } from '../../hooks';
import { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { STAKING_REQUEST_EVENT, UNSTAKING_REQUEST_EVENT } from '../../constants';
import { StakeTransactionDetails } from './details';
import { UnstakeTransactionInfo } from './info';
import { TransactionSummary } from './summary';
import { RenderExplorerLink } from '../../types';
import { GasFees } from '../gas';
import { TransactionOverview } from './TransactionOverview';
import { TransactionMoreDetails } from './TransactionMoreDetails';

interface TransactionReceiptProps {
    txn: IotaTransactionBlockResponse;
    activeAddress: string | null;
    summary: Exclude<ReturnType<typeof useTransactionSummary>, null>;
    renderExplorerLink: RenderExplorerLink;
}

export function TransactionReceipt({
    txn,
    activeAddress,
    summary,
    renderExplorerLink,
}: TransactionReceiptProps) {
    const [showDetails, setShowDetails] = useState(false);
    const { events } = txn;

    const stakeTypeTransaction = events?.find(({ type }) => type === STAKING_REQUEST_EVENT);
    const unstakeTypeTransaction = events?.find(({ type }) => type === UNSTAKING_REQUEST_EVENT);

    // Stake and unstake flows keep their existing dedicated layouts.
    if (stakeTypeTransaction || unstakeTypeTransaction) {
        return (
            <div className="flex flex-col gap-md overflow-y-auto overflow-x-hidden">
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
            </div>
        );
    }

    const { display } = summary;

    // Fallback for callers that don't have display data (dry-run paths, legacy consumers).
    if (!display) {
        const isSender = txn.transaction?.data.sender === activeAddress;
        return (
            <div className="flex flex-col gap-md overflow-y-auto overflow-x-hidden">
                <TransactionSummary summary={summary} renderExplorerLink={renderExplorerLink} />
                {isSender && (
                    <GasFees
                        gasSummary={summary?.gas}
                        renderExplorerLink={renderExplorerLink}
                        activeAddress={activeAddress}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-md overflow-y-auto overflow-x-hidden">
            <TransactionOverview
                display={display}
                activeAddress={activeAddress}
                renderExplorerLink={renderExplorerLink}
            />

            <Button
                size={ButtonSize.Small}
                type={ButtonType.Ghost}
                text={showDetails ? 'Hide details' : 'Show details'}
                onClick={() => setShowDetails((prev) => !prev)}
            />

            {showDetails && (
                <TransactionMoreDetails
                    display={display}
                    activeAddress={activeAddress}
                    gas={summary.gas}
                    renderExplorerLink={renderExplorerLink}
                />
            )}
        </div>
    );
}
