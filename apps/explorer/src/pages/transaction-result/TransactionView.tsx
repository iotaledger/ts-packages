// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { useState } from 'react';
import { ErrorBoundary } from '~/components';
import { Events } from '~/pages/transaction-result/Events';
import { TransactionData } from '~/pages/transaction-result/TransactionData';
import { TransactionSummary } from '~/pages/transaction-result/transaction-summary';
import { Signatures } from './Signatures';
import { PageSection, TransactionNav } from './TransactionNav';
import { TransactionOverview } from './TransactionOverview';
import { TransactionStatusHero } from './TransactionStatusHero';
import { useRecognizedPackages, useTransactionSummary } from '@iota/core';
import { ButtonSegment, ButtonSegmentType, Divider, Panel } from '@iota/apps-ui-kit';

interface TransactionViewProps {
    transaction: IotaTransactionBlockResponse;
}

enum TabCategory {
    Summary = 'summary',
    Events = 'events',
    Signatures = 'signatures',
}

export function TransactionView({ transaction }: TransactionViewProps): JSX.Element {
    const [activeTab, setActiveTab] = useState<string>(TabCategory.Summary);

    const hasEvents = !!transaction.events?.length;
    const transactionKindName = transaction.transaction?.data.transaction?.kind;
    const isProgrammableTransaction = transactionKindName === 'ProgrammableTransaction';

    const recognizedPackagesList = useRecognizedPackages();
    const summary = useTransactionSummary({
        transaction,
        recognizedPackagesList,
    });

    return (
        <div className="flex h-full flex-col gap-2xl">
            <TransactionNav transaction={transaction} />
            <div
                id={PageSection.Overview}
                className="flex scroll-mt-[288px] flex-col gap-2xl sm:scroll-mt-[180px] md:scroll-mt-[148px]"
            >
                <Panel>
                    <TransactionStatusHero transaction={transaction} />
                </Panel>
                <Panel>
                    <TransactionOverview transaction={transaction} gasSummary={summary?.gas} />
                </Panel>
            </div>
            <div className="flex h-full flex-col gap-lg">
                <div
                    id={PageSection.Summary}
                    className="scroll-mt-[288px] sm:scroll-mt-[180px] md:scroll-mt-[148px]"
                >
                    <Panel>
                        <div className="grid grid-cols-2 gap-x-md gap-y-xs px-md--rs sm:flex sm:flex-row sm:flex-wrap sm:px-0">
                            <ButtonSegment
                                onClick={() => setActiveTab(TabCategory.Summary)}
                                label="Summary"
                                selected={activeTab === TabCategory.Summary}
                                type={ButtonSegmentType.Underlined}
                            />
                            {hasEvents && (
                                <ButtonSegment
                                    onClick={() => setActiveTab(TabCategory.Events)}
                                    label="Events"
                                    selected={activeTab === TabCategory.Events}
                                    type={ButtonSegmentType.Underlined}
                                />
                            )}
                            {isProgrammableTransaction && (
                                <ButtonSegment
                                    onClick={() => setActiveTab(TabCategory.Signatures)}
                                    label="Signatures"
                                    selected={activeTab === TabCategory.Signatures}
                                    type={ButtonSegmentType.Underlined}
                                />
                            )}
                        </div>
                        {activeTab === TabCategory.Summary && (
                            <TransactionSummary transaction={transaction} />
                        )}
                        {hasEvents && activeTab === TabCategory.Events && (
                            <Events events={transaction.events!} />
                        )}
                        {isProgrammableTransaction && activeTab === TabCategory.Signatures && (
                            <ErrorBoundary>
                                <Signatures transaction={transaction} />
                            </ErrorBoundary>
                        )}
                    </Panel>
                </div>
                <Divider />
                <div data-testid="transaction-data" className="w-full">
                    <TransactionData transaction={transaction} />
                </div>
            </div>
        </div>
    );
}
