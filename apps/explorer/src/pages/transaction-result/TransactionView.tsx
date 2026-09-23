// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { TransactionData } from '~/pages/transaction-result/TransactionData';
import { TransactionSummary } from '~/pages/transaction-result/transaction-summary';
import { ErrorBoundary, SyntaxHighlighter } from '~/components';
import { PAGE_SECTION_SCROLL_MARGIN, PageSectionNav } from '~/components/ui';
import { useAdvancedMode } from '~/contexts';
import { PAGE_SECTION_LABELS, PageSection } from './pageSections';
import { hasEffectsDetails, TransactionEffects } from './TransactionEffects';
import { TransactionGas } from './TransactionGas';
import { TransactionOverview } from './TransactionOverview';
import { TransactionSignatures } from './TransactionSignatures';
import { TransactionStatusHero } from './TransactionStatusHero';
import { useRecognizedPackages, useTransactionSummary } from '@iota/core';
import { Panel, Toggle, ToggleLabelPosition, ToggleSize } from '@iota/apps-ui-kit';

interface TransactionViewProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionView({ transaction }: TransactionViewProps): JSX.Element {
    const [showRawJson, setShowRawJson] = useState(false);
    const { isAdvancedMode, toggle: toggleAdvancedMode } = useAdvancedMode();
    const recognizedPackagesList = useRecognizedPackages();
    const summary = useTransactionSummary({
        transaction,
        recognizedPackagesList,
    });

    const isProgrammableTransaction =
        transaction.transaction?.data.transaction?.kind === 'ProgrammableTransaction';
    const hasEvents = !!transaction.events?.length;
    const sender = transaction.transaction?.data.sender;
    const isSystemTransaction =
        !!sender && normalizeIotaAddress(sender) === normalizeIotaAddress('0x0');
    const hasGas = isProgrammableTransaction && !!summary?.gas;
    const hasSignatures = !isSystemTransaction && !!transaction.transaction?.txSignatures?.length;
    const hasEffects = hasEffectsDetails(transaction.effects);
    const hasChanges =
        !!transaction.objectChanges?.length ||
        (isProgrammableTransaction && !!transaction.balanceChanges?.length);

    const pageSections = [
        PageSection.Overview,
        ...(isAdvancedMode && hasGas ? [PageSection.Gas] : []),
        ...(isAdvancedMode && hasSignatures ? [PageSection.Signatures] : []),
        ...(isAdvancedMode && hasEffects ? [PageSection.Effects] : []),
        ...(hasChanges ? [PageSection.Changes] : []),
        ...(isProgrammableTransaction ? [PageSection.ProgrammableTx] : []),
        ...(hasEvents ? [PageSection.Events] : []),
    ].map((section) => ({ id: section, label: PAGE_SECTION_LABELS[section] }));

    return (
        <div className="flex h-full flex-col gap-2xl">
            <PageSectionNav
                sections={pageSections}
                actions={
                    <>
                        <Toggle
                            name="advanced-mode-toggle"
                            label="Advanced mode"
                            labelPosition={ToggleLabelPosition.Left}
                            size={ToggleSize.Small}
                            isToggled={isAdvancedMode}
                            onChange={toggleAdvancedMode}
                        />
                        <Toggle
                            name="raw-json-toggle"
                            label="Raw JSON"
                            labelPosition={ToggleLabelPosition.Left}
                            size={ToggleSize.Small}
                            isToggled={showRawJson}
                            onChange={setShowRawJson}
                        />
                    </>
                }
            />
            {showRawJson ? (
                <Panel>
                    <ErrorBoundary>
                        <div className="p-md--rs">
                            <SyntaxHighlighter
                                code={JSON.stringify(transaction, null, 2)}
                                language="json"
                            />
                        </div>
                    </ErrorBoundary>
                </Panel>
            ) : (
                <>
                    <div
                        id={PageSection.Overview}
                        className={`flex flex-col gap-2xl ${PAGE_SECTION_SCROLL_MARGIN}`}
                    >
                        <Panel>
                            <TransactionStatusHero transaction={transaction} />
                        </Panel>
                        <Panel>
                            <TransactionOverview transaction={transaction} />
                        </Panel>
                    </div>
                    {isAdvancedMode && hasGas && (
                        <div id={PageSection.Gas} className={PAGE_SECTION_SCROLL_MARGIN}>
                            <TransactionGas transaction={transaction} gasSummary={summary?.gas} />
                        </div>
                    )}
                    {isAdvancedMode && hasSignatures && (
                        <div id={PageSection.Signatures} className={PAGE_SECTION_SCROLL_MARGIN}>
                            <TransactionSignatures transaction={transaction} />
                        </div>
                    )}
                    {isAdvancedMode && hasEffects && (
                        <div id={PageSection.Effects} className={PAGE_SECTION_SCROLL_MARGIN}>
                            <TransactionEffects transaction={transaction} />
                        </div>
                    )}
                    <div className="flex h-full flex-col gap-2xl">
                        {hasChanges && (
                            <div id={PageSection.Changes} className={PAGE_SECTION_SCROLL_MARGIN}>
                                <TransactionSummary transaction={transaction} />
                            </div>
                        )}
                        <div data-testid="transaction-data" className="w-full">
                            <TransactionData transaction={transaction} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
