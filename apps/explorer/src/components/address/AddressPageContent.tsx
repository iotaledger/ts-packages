// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Panel, Title } from '@iota/apps-ui-kit';
import { PageSectionAnchor, PageSectionNav } from '~/components/ui';
import { ErrorBoundary } from '../error-boundary';
import { AddressStakingTab } from './AddressStakingTab';
import { OwnedCoins } from '../owned-coins';
import { OwnedObjects } from '../owned-objects';
import { TransactionsForAddress } from '../transactions';

enum AddressPageSection {
    Portfolio = 'portfolio-section',
    TransactionBlocks = 'transaction-blocks-section',
    Staking = 'staking-section',
}

const ADDRESS_PAGE_SECTIONS = [
    { id: AddressPageSection.Portfolio, label: 'Portfolio' },
    { id: AddressPageSection.TransactionBlocks, label: 'Transaction Blocks' },
    { id: AddressPageSection.Staking, label: 'Staking' },
];

interface AddressPageContentProps {
    address: string;
}

export function AddressPageContent({ address }: AddressPageContentProps): JSX.Element {
    return (
        <div className="flex flex-col gap-2xl">
            <PageSectionNav sections={ADDRESS_PAGE_SECTIONS} />
            <ErrorBoundary>
                <div className="flex flex-col gap-2xl">
                    <PageSectionAnchor id={AddressPageSection.Portfolio}>
                        <Panel>
                            <Title title="Portfolio" />
                            <div className="flex flex-col gap-2xl px-md--rs py-md md:py-sm">
                                <OwnedCoins id={address} />
                                <OwnedObjects id={address} />
                            </div>
                        </Panel>
                    </PageSectionAnchor>
                    <PageSectionAnchor id={AddressPageSection.TransactionBlocks}>
                        <Panel>
                            <Title title="Transaction Blocks" />
                            <div
                                data-testid="tx"
                                className="relative h-full min-h-14 overflow-auto px-md--rs py-md md:py-sm"
                            >
                                <TransactionsForAddress address={address} />
                            </div>
                        </Panel>
                    </PageSectionAnchor>
                    <PageSectionAnchor id={AddressPageSection.Staking}>
                        <Panel>
                            <Title title="Staking" />
                            <div className="h-full min-h-14 px-md--rs py-md md:py-sm">
                                <AddressStakingTab address={address} />
                            </div>
                        </Panel>
                    </PageSectionAnchor>
                </div>
            </ErrorBoundary>
        </div>
    );
}
