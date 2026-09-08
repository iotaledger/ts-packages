// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    type MoveCallIotaTransaction,
    type IotaTransaction,
    type IotaCallArg,
} from '@iota/iota-sdk/client';

import { Transaction } from './Transaction';
import { StackedField } from './Field';
import { getResultUsedByCommands } from './utils';
import { CollapsibleCard, ProgrammableTxnBlockCard } from '~/components';
import { TitleSize } from '@iota/apps-ui-kit';
import { HighlightableRef, usePtbHighlight } from './PtbHighlight';

interface TransactionsCardProps {
    transactions: IotaTransaction[];
    inputs: IotaCallArg[];
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

export function TransactionsCard({
    transactions,
    inputs,
}: TransactionsCardProps): JSX.Element | null {
    if (!transactions?.length) {
        return null;
    }

    const expandableItems = transactions.map((transaction, index) => {
        const [[type, data]] = Object.entries(transaction);
        const usedByCommands = getResultUsedByCommands(index, transactions);
        const refId = `command-${index}` as const;
        const { isHighlighted } = usePtbHighlight(refId);

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
                className={
                    isHighlighted
                        ? 'rounded-xl ring-1 ring-iota-primary-30 dark:ring-iota-primary-80'
                        : undefined
                }
            >
                <div data-testid="transactions-card-content">
                    <div className="mx-auto flex w-full max-w-5xl flex-col divide-y divide-iota-neutral-92 px-lg pb-lg pt-xs dark:divide-iota-neutral-12">
                        {usedByCommands.length > 0 && (
                            <StackedField
                                keyText="Used by"
                                value={
                                    <span className="flex flex-wrap gap-x-xxs">
                                        {usedByCommands.map(
                                            (
                                                { commandIndex, type: usedByType, nestedIndex },
                                                usedByIndex,
                                            ) => (
                                                <HighlightableRef
                                                    key={`${commandIndex}-${nestedIndex ?? ''}`}
                                                    refId={`command-${commandIndex}`}
                                                >
                                                    Command #{commandIndex}
                                                    {nestedIndex !== undefined
                                                        ? `[${nestedIndex}]`
                                                        : ''}{' '}
                                                    ({usedByType})
                                                    {usedByIndex < usedByCommands.length - 1
                                                        ? ','
                                                        : ''}
                                                </HighlightableRef>
                                            ),
                                        )}
                                    </span>
                                }
                            />
                        )}
                        <Transaction type={type} data={data} inputs={inputs} />
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
