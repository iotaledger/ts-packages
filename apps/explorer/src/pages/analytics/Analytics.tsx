// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    AddressesCardGraph,
    GasFeesHistoryChart,
    GasPriceHistoryChart,
    NetworkDataGrid,
    NewAccountsHistoryChart,
    PageLayout,
    StakingRewardsHistoryChart,
    StorageHistoryChart,
    SupplyHistoryChart,
    TokenEmissionChart,
    TotalStakeHistoryChart,
    TransactionsCardGraph,
} from '~/components';

function SectionTitle({ children }: { children: string }): JSX.Element {
    return (
        <span className="text-title-md text-iota-neutral-10 dark:text-iota-neutral-92">
            {children}
        </span>
    );
}

export function Analytics(): JSX.Element {
    return (
        <PageLayout
            content={
                <div className="flex w-full flex-col gap-2xl">
                    <div className="pt-md--rs text-display-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                        Analytics
                    </div>

                    <NetworkDataGrid showAnalyticsLink={false} />

                    <div className="flex flex-col gap-md">
                        <SectionTitle>Historical Data</SectionTitle>
                        <div className="grid grid-cols-1 gap-md--rs md:grid-cols-2">
                            <SupplyHistoryChart />
                            <TransactionsCardGraph />
                            <AddressesCardGraph />
                            <NewAccountsHistoryChart />
                        </div>
                    </div>

                    <div className="flex flex-col gap-md">
                        <SectionTitle>Network Economics</SectionTitle>
                        <div className="grid grid-cols-1 gap-md--rs md:grid-cols-2">
                            <TotalStakeHistoryChart />
                            <TokenEmissionChart />
                            <GasPriceHistoryChart />
                            <GasFeesHistoryChart />
                            <StakingRewardsHistoryChart />
                            <StorageHistoryChart />
                        </div>
                    </div>
                </div>
            }
        />
    );
}
