// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Panel, Title } from '@iota/apps-ui-kit';
import { PageSectionAnchor, PageSectionNav } from '~/components/ui';
import { useAddressBalanceSummary } from '~/hooks';
import { ErrorBoundary } from '../error-boundary';
import { AddressStakingTab } from './AddressStakingTab';
import { OwnedCoins } from '../owned-coins';
import { OwnedObjects } from '../owned-objects';
import { TransactionsForAddress } from '../transactions';

enum AddressPageSection {
    Activity = 'activity-section',
    Portfolio = 'portfolio-section',
    TransactionBlocks = 'transaction-blocks-section',
    Staking = 'staking-section',
}

interface AddressPageContentProps {
    address: string;
}

export function AddressPageContent({ address }: AddressPageContentProps): JSX.Element {
    const {
        stakedBalance,
        timelockedStakedBalance,
        timelockedBalance,
        isLoadingStaked,
        isLoadingTimelockedStaked,
        isLoadingTimelocked,
        isStakedErrored,
        isTimelockedStakedErrored,
        isTimelockedErrored,
    } = useAddressBalanceSummary(address);

    const isLoadingStakingData =
        isLoadingStaked || isLoadingTimelockedStaked || isLoadingTimelocked;
    const isStakingDataErrored =
        isStakedErrored || isTimelockedStakedErrored || isTimelockedErrored;
    const hasStakingData =
        stakedBalance > 0n || timelockedStakedBalance > 0n || timelockedBalance > 0n;
    const showStakingSection = isLoadingStakingData || isStakingDataErrored || hasStakingData;

    const sections = [
        { id: AddressPageSection.Activity, label: 'Activity' },
        { id: AddressPageSection.Portfolio, label: 'Portfolio' },
        ...(showStakingSection ? [{ id: AddressPageSection.Staking, label: 'Staking' }] : []),
        { id: AddressPageSection.TransactionBlocks, label: 'Transaction Blocks' },
    ];

    return (
        <div className="flex flex-col gap-2xl">
            <PageSectionNav sections={sections} />
            <ErrorBoundary>
                <div className="flex flex-col gap-lg">
                    <PageSectionAnchor id={AddressPageSection.Activity}>
                        <Panel>
                            <div className="py-sm">
                                <Title title="Activity" />
                            </div>
                            <div
                                data-testid="tx"
                                className="relative h-full min-h-14 overflow-auto px-md--rs py-md md:py-sm"
                            >
                                <TransactionsForAddress address={address} view="activity" />
                            </div>
                        </Panel>
                    </PageSectionAnchor>
                    <PageSectionAnchor id={AddressPageSection.Portfolio}>
                        <Panel>
                            <div className="py-sm">
                                <Title title="Portfolio" />
                            </div>
                            <div className="flex flex-col gap-2xl px-md--rs py-md md:py-sm">
                                <OwnedCoins id={address} />
                                <OwnedObjects id={address} />
                            </div>
                        </Panel>
                    </PageSectionAnchor>
                    {showStakingSection && (
                        <PageSectionAnchor id={AddressPageSection.Staking}>
                            <Panel>
                                <div className="py-sm">
                                    <Title title="Staking" />
                                </div>
                                <div className="h-full min-h-14 px-md--rs py-md md:py-sm">
                                    <AddressStakingTab address={address} />
                                </div>
                            </Panel>
                        </PageSectionAnchor>
                    )}
                    <PageSectionAnchor id={AddressPageSection.TransactionBlocks}>
                        <Panel>
                            <div className="py-sm">
                                <Title title="Transaction Blocks" />
                            </div>
                            <div
                                data-testid="tx"
                                className="relative h-full min-h-14 overflow-auto px-md--rs py-md md:py-sm"
                            >
                                <TransactionsForAddress
                                    address={address}
                                    view="transaction-blocks"
                                />
                            </div>
                        </Panel>
                    </PageSectionAnchor>
                </div>
            </ErrorBoundary>
        </div>
    );
}
