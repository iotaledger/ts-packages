// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    AddressesCardGraph,
    GasFeesHistoryChart,
    GasPriceHistoryChart,
    NetworkDataGrid,
    PageLayout,
    StakingRewardsHistoryChart,
    StorageFundHistoryChart,
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
                <div className="flex w-full flex-col gap-xl">
                    <div className="pt-md--rs text-display-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                        Analytics
                    </div>

                    <div className="flex flex-col gap-md">
                        <SectionTitle>Historical Data</SectionTitle>
                        <div className="grid grid-cols-1 gap-md--rs md:grid-cols-2">
                            <SupplyHistoryChart />
                            <TransactionsCardGraph />
                            <AddressesCardGraph />
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
                            <StorageFundHistoryChart />
                        </div>
                    </div>

                    <NetworkDataGrid showAnalyticsLink={false} />
                </div>
            }
        />
    );
}
