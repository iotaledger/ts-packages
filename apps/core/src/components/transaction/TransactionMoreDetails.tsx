// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type TransactionDisplay } from '../../utils/transaction/buildTransactionDisplay';
import { type RenderExplorerLink, type GasSummaryType } from '../../types';
import { BalanceChanges } from '../cards/BalanceChanges';
import { GasFees } from '../gas';
import { NarratedObjectChangeGroup } from './NarratedObjectChangeGroup';

interface TransactionMoreDetailsProps {
    display: TransactionDisplay;
    activeAddress: string | null;
    gas?: GasSummaryType;
    renderExplorerLink: RenderExplorerLink;
}

export function TransactionMoreDetails({
    display,
    activeAddress,
    gas,
    renderExplorerLink,
}: TransactionMoreDetailsProps) {
    const isSender = !!activeAddress && display.sender === activeAddress;

    return (
        <div className="flex flex-col gap-md">
            {/* Balance changes per owner */}
            <BalanceChanges
                changes={display.balanceChangesByOwner}
                renderExplorerLink={renderExplorerLink}
            />

            {/* Narrated object change buckets — empty buckets render nothing */}
            <NarratedObjectChangeGroup
                title="Received"
                items={display.narratedObjectChanges.received}
                renderExplorerLink={renderExplorerLink}
            />
            <NarratedObjectChangeGroup
                title="Minted"
                items={display.narratedObjectChanges.minted}
                renderExplorerLink={renderExplorerLink}
            />
            <NarratedObjectChangeGroup
                title="Sent"
                items={display.narratedObjectChanges.sent}
                renderExplorerLink={renderExplorerLink}
            />
            <NarratedObjectChangeGroup
                title="Published"
                items={display.narratedObjectChanges.published}
                renderExplorerLink={renderExplorerLink}
            />
            <NarratedObjectChangeGroup
                title="Other Changes"
                items={display.narratedObjectChanges.internal}
                renderExplorerLink={renderExplorerLink}
            />

            {/* Gas breakdown — only visible for the sender */}
            {isSender && (
                <GasFees
                    gasSummary={gas}
                    activeAddress={activeAddress}
                    renderExplorerLink={renderExplorerLink}
                />
            )}
        </div>
    );
}
