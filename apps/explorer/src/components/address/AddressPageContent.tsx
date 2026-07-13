// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import {
    ButtonSegment,
    ButtonSegmentType,
    Panel,
    SegmentedButton,
    SegmentedButtonType,
} from '@iota/apps-ui-kit';
import { ErrorBoundary } from '../error-boundary';
import { OwnedCoins } from '../owned-coins';
import { OwnedObjects } from '../owned-objects';
import { TransactionsForAddress } from '../transactions';

enum AddressPageTab {
    Portfolio = 'portfolio',
    TransactionBlocks = 'transactionBlocks',
}

interface AddressPageContentProps {
    address: string;
}

export function AddressPageContent({ address }: AddressPageContentProps): JSX.Element {
    const [activeTab, setActiveTab] = useState<AddressPageTab>(AddressPageTab.Portfolio);

    return (
        <Panel>
            <div className="grid grid-cols-2 gap-x-md gap-y-xs px-md--rs sm:flex sm:flex-row sm:flex-wrap sm:px-0">
                <SegmentedButton
                    type={SegmentedButtonType.Transparent}
                    shape={ButtonSegmentType.Underlined}
                >
                    <ButtonSegment
                        type={ButtonSegmentType.Underlined}
                        label="Portfolio"
                        selected={activeTab === AddressPageTab.Portfolio}
                        onClick={() => setActiveTab(AddressPageTab.Portfolio)}
                    />
                    <ButtonSegment
                        type={ButtonSegmentType.Underlined}
                        label="Transaction Blocks"
                        selected={activeTab === AddressPageTab.TransactionBlocks}
                        onClick={() => setActiveTab(AddressPageTab.TransactionBlocks)}
                    />
                </SegmentedButton>
            </div>
            <div className="flex flex-col gap-2xl">
                <ErrorBoundary>
                    {activeTab === AddressPageTab.Portfolio ? (
                        <div className="flex flex-col gap-2xl px-md--rs py-md md:py-sm">
                            <OwnedCoins id={address} />
                            <OwnedObjects id={address} />
                        </div>
                    ) : (
                        <div
                            data-testid="tx"
                            className="relative mt-4 h-full min-h-14 overflow-auto px-md--rs py-md md:py-sm"
                        >
                            <TransactionsForAddress address={address} />
                        </div>
                    )}
                </ErrorBoundary>
            </div>
        </Panel>
    );
}
