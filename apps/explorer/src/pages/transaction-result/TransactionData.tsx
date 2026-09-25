// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    type ProgrammableTransaction,
    type IotaTransactionBlockResponse,
} from '@iota/iota-sdk/client';
import { ProgrammableTransactionCard } from '~/pages/transaction-result/programmable-transaction-view/ProgrammableTransactionCard';
import { PtbHighlightProvider } from '~/pages/transaction-result/programmable-transaction-view/PtbHighlight';
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
                <PtbHighlightProvider>
                    <div id={PageSection.ProgrammableTx} className={PAGE_SECTION_SCROLL_MARGIN}>
                        <ProgrammableTransactionCard
                            inputs={programmableTxn.inputs}
                            transactions={programmableTxn.transactions}
                        />
                    </div>
                </PtbHighlightProvider>
            )}
            {hasEvents && (
                <div id={PageSection.Events} className={PAGE_SECTION_SCROLL_MARGIN}>
                    <Events events={transaction.events!} />
                </div>
            )}
        </div>
    );
}
