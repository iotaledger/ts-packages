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
import { PageSection } from './TransactionNav';

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
                        className="scroll-mt-[288px] sm:scroll-mt-[180px] md:scroll-mt-[148px]"
                    >
                        <InputsCard inputs={programmableTxn.inputs} />
                    </div>
                    <div
                        data-testid="transactions-card"
                        id={PageSection.Transactions}
                        className="scroll-mt-[288px] sm:scroll-mt-[180px] md:scroll-mt-[148px]"
                    >
                        <TransactionsCard transactions={programmableTxn.transactions} />
                    </div>
                </section>
            )}
            {hasEvents && (
                <div
                    id={PageSection.Events}
                    className="scroll-mt-[288px] sm:scroll-mt-[180px] md:scroll-mt-[148px]"
                >
                    <Events events={transaction.events!} />
                </div>
            )}
        </div>
    );
}
