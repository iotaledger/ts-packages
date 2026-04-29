// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Panel, Title } from '@iota/apps-ui-kit';
import { ErrorBoundary } from './error-boundary';
import { TransactionsForAddress } from './transactions';

export function TransactionBlocksPanel({ address }: { address: string }) {
    return (
        <Panel>
            <Title title="Transaction Blocks" />
            <div className="flex flex-col gap-2xl p-md--rs">
                <ErrorBoundary>
                    <div data-testid="tx" className="min-h-14 relative mt-4 h-full overflow-auto">
                        <TransactionsForAddress address={address} />
                    </div>
                </ErrorBoundary>
            </div>
        </Panel>
    );
}
