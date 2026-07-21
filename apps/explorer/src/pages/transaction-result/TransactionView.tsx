// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { TransactionData } from '~/pages/transaction-result/TransactionData';
import { TransactionSummary } from '~/pages/transaction-result/transaction-summary';
import { PageSection, TransactionNav } from './TransactionNav';
import { TransactionOverview } from './TransactionOverview';
import { TransactionStatusHero } from './TransactionStatusHero';
import { useRecognizedPackages, useTransactionSummary } from '@iota/core';
import { Divider, Panel } from '@iota/apps-ui-kit';

interface TransactionViewProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionView({ transaction }: TransactionViewProps): JSX.Element {
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
                    id={PageSection.Changes}
                    className="scroll-mt-[288px] sm:scroll-mt-[180px] md:scroll-mt-[148px]"
                >
                    <TransactionSummary transaction={transaction} />
                </div>
                <Divider />
                <div data-testid="transaction-data" className="w-full">
                    <TransactionData transaction={transaction} />
                </div>
            </div>
        </div>
    );
}
