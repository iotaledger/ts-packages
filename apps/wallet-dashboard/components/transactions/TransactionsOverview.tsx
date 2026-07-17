// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Panel, Title } from '@iota/apps-ui-kit';
import { TransactionsList } from './TransactionsList';
import { useBalanceVisibility } from '@/store/balanceVisibility';

export function TransactionsOverview() {
    const { isBalanceVisible } = useBalanceVisibility();
    return (
        <Panel>
            <Title title="Activity" />
            <div
                className="h-full max-h-[400px] flex-1 overflow-y-auto px-sm pb-md  pt-sm sm:max-h-none"
                data-testid="home-page-activity-section"
            >
                <TransactionsList heightClassName="h-full" hideBalance={!isBalanceVisible} />
            </div>
        </Panel>
    );
}
