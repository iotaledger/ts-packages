// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaCallArg, type IotaTransaction } from '@iota/iota-sdk/client';

import { type TransactionDisplay } from '../../utils/transaction/buildTransactionDisplay';
import { type RenderExplorerLink, type GasSummaryType } from '../../types';
import { BalanceChanges } from '../cards/BalanceChanges';
import { GasFees } from '../gas';
import { NarratedObjectChangeGroup } from './NarratedObjectChangeGroup';
import { PtbEffectRows } from './PtbEffectRows';
import { PtbRawCommands } from './PtbRawCommands';
import { WalletEffects } from './WalletEffects';

interface TransactionMoreDetailsProps {
    display: TransactionDisplay;
    activeAddress: string | null;
    gas?: GasSummaryType;
    renderExplorerLink: RenderExplorerLink;
    /** Raw PTB commands for Tier 4 (extracted from txn.transaction.data.transaction). */
    ptbCommands?: IotaTransaction[];
    /** Raw PTB inputs for Tier 4. */
    ptbInputs?: IotaCallArg[];
}

export function TransactionMoreDetails({
    display,
    activeAddress,
    gas,
    renderExplorerLink,
    ptbCommands,
    ptbInputs,
}: TransactionMoreDetailsProps) {
    const isSender = !!activeAddress && display.sender === activeAddress;
    const hasPtb = !!display.ptbRecognition;
    const isUnrecognized = hasPtb && !display.ptbRecognition!.recognized;

    if (hasPtb) {
        return (
            <div className="flex flex-col gap-md">
                {/* Tier 2 — plain-English summary of what happened */}
                <PtbEffectRows recognition={display.ptbRecognition!} />

                {/* Tier 3 — balance changes + object ownership changes */}
                <WalletEffects
                    display={display}
                    renderExplorerLink={renderExplorerLink}
                    defaultObjectsExpanded={isUnrecognized}
                />

                {/* Tier 4 — raw commands for power users, collapsed by default */}
                {ptbCommands && ptbInputs && (
                    <PtbRawCommands
                        commands={ptbCommands}
                        inputs={ptbInputs}
                        renderExplorerLink={renderExplorerLink}
                    />
                )}

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

    // Non-PTB fallback: system txs, migration, etc.
    return (
        <div className="flex flex-col gap-md">
            <BalanceChanges
                changes={display.balanceChangesByOwner}
                renderExplorerLink={renderExplorerLink}
            />

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
