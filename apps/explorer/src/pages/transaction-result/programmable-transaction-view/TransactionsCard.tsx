// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type MoveCallIotaTransaction, type IotaTransaction } from '@iota/iota-sdk/client';

import { Transaction } from './Transaction';
import { CollapsibleCard, ProgrammableTxnBlockCard } from '~/components';
import { TitleSize } from '@iota/apps-ui-kit';

interface TransactionsCardProps {
    transactions: IotaTransaction[];
}

function getTransactionSupportingElement(type: string, data: unknown): JSX.Element | null {
    if (type === 'MoveCall') {
        const { function: func } = data as MoveCallIotaTransaction;
        return (
            <span className="ml-xs text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                {func}
            </span>
        );
    }

    return null;
}

export function TransactionsCard({ transactions }: TransactionsCardProps): JSX.Element | null {
    if (!transactions?.length) {
        return null;
    }

    const expandableItems = transactions.map((transaction, index) => {
        const [[type, data]] = Object.entries(transaction);

        return (
            <CollapsibleCard
                key={index}
                title={type}
                supportingTitleElement={getTransactionSupportingElement(type, data)}
                titleSize={TitleSize.Small}
                collapsible
                compactHeader
                initialClose
                isTransparent
            >
                <div data-testid="transactions-card-content">
                    <div className="mx-auto w-full max-w-5xl px-lg pb-lg pt-xs">
                        <Transaction type={type} data={data} />
                    </div>
                </div>
            </CollapsibleCard>
        );
    });

    return (
        <ProgrammableTxnBlockCard
            items={expandableItems}
            itemsLabel="Transactions"
            rawData={transactions}
        />
    );
}
