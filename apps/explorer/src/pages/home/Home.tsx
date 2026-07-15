// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Activity,
    ErrorBoundary,
    NetworkDataGrid,
    EpochHeroCard,
    StakingHeroCard,
    PageLayout,
    TopValidatorsCard,
} from '~/components';

const TRANSACTIONS_LIMIT = 15;
const TOP_VALIDATORS_LIMIT = 10;

export function Home(): JSX.Element {
    return (
        <PageLayout
            content={
                <div data-testid="home-page" className="flex flex-col gap-xl">
                    {/* Hero */}
                    <div className="grid grid-cols-1 gap-md--rs md:grid-cols-2">
                        <EpochHeroCard />
                        <StakingHeroCard />
                    </div>

                    {/* Network Data */}
                    <NetworkDataGrid showExtendedStats={false} />

                    {/* Activity */}
                    <ErrorBoundary>
                        <Activity
                            initialLimit={TRANSACTIONS_LIMIT}
                            disablePagination
                            defaultShowSystemTransactions={false}
                        />
                    </ErrorBoundary>

                    {/* Top Validators */}
                    <div data-testid="validators-table">
                        <TopValidatorsCard limit={TOP_VALIDATORS_LIMIT} showIcon />
                    </div>
                </div>
            }
        />
    );
}
