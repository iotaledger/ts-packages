// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { useState } from 'react';
import { ErrorBoundary, SyntaxHighlighter } from '~/components';
import { Events } from '~/pages/transaction-result/Events';
import { TransactionData } from '~/pages/transaction-result/TransactionData';
import { TransactionSummary } from '~/pages/transaction-result/transaction-summary';
import { Signatures } from './Signatures';
import { TransactionDetails } from './transaction-summary/TransactionDetails';
import { useRecognizedPackages, useTransactionSummary } from '@iota/core';
import {
    ButtonSegment,
    ButtonSegmentType,
    Divider,
    Panel,
    SegmentedButton,
    SegmentedButtonType,
} from '@iota/apps-ui-kit';

interface TransactionViewProps {
    transaction: IotaTransactionBlockResponse;
}

enum TabCategory {
    Summary = 'summary',
    Events = 'events',
    Signatures = 'signatures',
    RawJson = 'rawJson',
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
            <div>
                <TransactionDetails
                    timestamp={summary?.timestamp}
                    sender={summary?.sender}
                    checkpoint={transaction.checkpoint}
                    executedEpoch={transaction.effects?.executedEpoch}
                    totalGas={summary?.gas?.totalGas}
                />
            </div>
            <div className="flex h-full flex-col gap-lg">
                <Panel>
                    <SegmentedButton
                        type={SegmentedButtonType.Transparent}
                        shape={ButtonSegmentType.Underlined}
                    >
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
                        <ButtonSegment
                            onClick={() => setActiveTab(TabCategory.RawJson)}
                            label="Raw JSON"
                            selected={activeTab === TabCategory.RawJson}
                            type={ButtonSegmentType.Underlined}
                        />
                    </SegmentedButton>
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
                    {activeTab === TabCategory.RawJson && (
                        <ErrorBoundary>
                            <div className="p-md--rs">
                                <SyntaxHighlighter
                                    code={JSON.stringify(transaction, null, 2)}
                                    language="json"
                                />
                            </div>
                        </ErrorBoundary>
                    )}
                </Panel>
                <Divider />
                <div data-testid="transaction-data" className="w-full">
                    <TransactionData transaction={transaction} />
                </div>
            </div>
        </div>
    );
}
