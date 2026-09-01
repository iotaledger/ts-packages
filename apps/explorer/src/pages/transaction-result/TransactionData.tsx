// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    type ProgrammableTransaction,
    type IotaTransactionBlockResponse,
} from '@iota/iota-sdk/client';
import { InputsCard } from '~/pages/transaction-result/programmable-transaction-view/InputsCard';
import { TransactionsCard } from '~/pages/transaction-result/programmable-transaction-view/TransactionsCard';
import { Events } from '~/pages/transaction-result/Events';
import { PAGE_SECTION_SCROLL_MARGIN } from '~/components/ui';
import { PageSection } from './pageSections';

interface TransactionDataProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionData({ transaction }: TransactionDataProps): JSX.Element {
    const transactionKindName = transaction.transaction?.data.transaction.kind;

    const isProgrammableTransaction = transactionKindName === 'ProgrammableTransaction';

    const programmableTxn = transaction.transaction!.data.transaction as ProgrammableTransaction;
    const hasEvents = !!transaction.events?.length;

    return (
        <div className="flex w-full flex-col gap-3 md:gap-6">
            {isProgrammableTransaction && (
                <section className="flex w-full flex-1 flex-col gap-3 md:gap-6">
                    <div
                        data-testid="inputs-card"
                        id={PageSection.Inputs}
                        className={PAGE_SECTION_SCROLL_MARGIN}
                    >
                        <InputsCard
                            inputs={programmableTxn.inputs}
                            transactions={programmableTxn.transactions}
                        />
                    </div>
                    <div
                        data-testid="transactions-card"
                        id={PageSection.Transactions}
                        className={PAGE_SECTION_SCROLL_MARGIN}
                    >
                        <TransactionsCard
                            transactions={programmableTxn.transactions}
                            inputs={programmableTxn.inputs}
                        />
                    </div>
                </section>
            )}
            {hasEvents && (
                <div id={PageSection.Events} className={PAGE_SECTION_SCROLL_MARGIN}>
                    <Events events={transaction.events!} />
                </div>
            )}
        </div>
    );
}
