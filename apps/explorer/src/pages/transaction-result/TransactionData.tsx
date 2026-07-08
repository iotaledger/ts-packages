// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useRecognizedPackages, useTransactionSummary } from '@iota/core';
import {
    type ProgrammableTransaction,
    type IotaTransactionBlockResponse,
} from '@iota/iota-sdk/client';
import { GasBreakdown } from '~/components';
import { InputsCard } from '~/pages/transaction-result/programmable-transaction-view/InputsCard';
import { TransactionsCard } from '~/pages/transaction-result/programmable-transaction-view/TransactionsCard';

interface TransactionDataProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionData({ transaction }: TransactionDataProps): JSX.Element {
    const recognizedPackagesList = useRecognizedPackages();
    const summary = useTransactionSummary({
        transaction,
        recognizedPackagesList,
    });

    const transactionKindName = transaction.transaction?.data.transaction.kind;

    const isProgrammableTransaction = transactionKindName === 'ProgrammableTransaction';

    const programmableTxn = transaction.transaction!.data.transaction as ProgrammableTransaction;

    return (
        <div className="flex w-full flex-col gap-3 md:gap-6">
            {isProgrammableTransaction && (
                <section className="flex w-full flex-1 flex-col gap-3 md:gap-6">
                    <div data-testid="gas-breakdown" id="gas-section" className="scroll-mt-2xl">
                        <GasBreakdown summary={summary} />
                    </div>
                    <div data-testid="inputs-card" id="inputs-section" className="scroll-mt-2xl">
                        <InputsCard inputs={programmableTxn.inputs} />
                    </div>
                    <div
                        data-testid="transactions-card"
                        id="transactions-section"
                        className="scroll-mt-2xl"
                    >
                        <TransactionsCard transactions={programmableTxn.transactions} />
                    </div>
                </section>
            )}
        </div>
    );
}
