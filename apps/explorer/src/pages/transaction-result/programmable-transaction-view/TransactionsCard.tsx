// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    type MoveCallIotaTransaction,
    type IotaTransaction,
    type IotaCallArg,
} from '@iota/iota-sdk/client';

import { Transaction } from './Transaction';
import { getResultUsedByCommands } from './utils';
import { CollapsibleCard, ProgrammableTxnBlockCard } from '~/components';
import { useBreakpoint } from '~/hooks';
import { KeyValueInfo, TitleSize } from '@iota/apps-ui-kit';

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
    const isMediumOrAbove = useBreakpoint('md');
    if (!transactions?.length) {
        return null;
    }

    const expandableItems = transactions.map((transaction, index) => {
        const [[type, data]] = Object.entries(transaction);
        const usedByCommands = getResultUsedByCommands(index, transactions);

        return (
            <CollapsibleCard
                key={index}
                title={type}
                supportingTitleElement={getTransactionSupportingElement(type, data)}
                titleSize={TitleSize.Small}
                collapsible
                initialClose
            >
                <div data-testid="transactions-card-content">
                    <div className="flex flex-col gap-2 px-md pb-lg pt-xs">
                        {usedByCommands.length > 0 && (
                            <KeyValueInfo
                                keyText="Used by"
                                value={usedByCommands
                                    .map(
                                        ({ commandIndex, type: usedByType, nestedIndex }) =>
                                            `Command #${commandIndex}${
                                                nestedIndex !== undefined ? `[${nestedIndex}]` : ''
                                            } (${usedByType})`,
                                    )
                                    .join(', ')}
                                fullwidth={!isMediumOrAbove}
                            />
                        )}
                        <Transaction key={index} type={type} data={data} inputs={inputs} />
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
            defaultItemsToShow={4}
        />
    );
}
