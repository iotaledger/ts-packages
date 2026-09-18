// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useFeatureIsOn } from '@iota/apps-backend-client';
import { useEffect, useState } from 'react';
import { Feature, toast } from '@iota/core';
import { CheckpointsTable } from '../checkpoints/CheckpointsTable';
import { EpochsActivityTable } from './EpochsActivityTable';
import { TransactionsActivityTable } from './TransactionsActivityTable';
import { PlayPause } from '~/components/ui';
import {
    ButtonSegment,
    ButtonSegmentType,
    Panel,
    SegmentedButton,
    SegmentedButtonType,
    Toggle,
    ToggleSize,
} from '@iota/apps-ui-kit';

export enum ActivityCategory {
    Transactions = 'transactions',
    Epochs = 'epochs',
    Checkpoints = 'checkpoints',
}
export const ACTIVITY_CATEGORIES = [
    {
        label: 'Transactions',
        value: ActivityCategory.Transactions,
    },
    {
        label: 'Epochs',
        value: ActivityCategory.Epochs,
    },
    {
        label: 'Checkpoints',
        value: ActivityCategory.Checkpoints,
    },
];

type ActivityProps = {
    initialTab?: string | null;
    initialLimit: number;
    disablePagination?: boolean;
    defaultShowSystemTransactions?: boolean;
    onCategoryChange?: (category: ActivityCategory) => void;
};

const AUTO_REFRESH_ID = 'auto-refresh';
const REFETCH_INTERVAL_SECONDS = 10;
const REFETCH_INTERVAL = REFETCH_INTERVAL_SECONDS * 1000;

function toActivityCategory(value: string | null | undefined): ActivityCategory | undefined {
    return Object.values(ActivityCategory).find((category) => category === value);
}

export function Activity({
    initialTab,
    initialLimit,
    disablePagination,
    defaultShowSystemTransactions = true,
    onCategoryChange,
}: ActivityProps): JSX.Element {
    const pollingTxnTableEnabled = useFeatureIsOn(Feature.PollingTxnTable as string);

    const [paused, setPaused] = useState(false);
    const [showSystemTransactions, setshowSystemTransactions] = useState(
        defaultShowSystemTransactions,
    );
    const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>(
        toActivityCategory(initialTab) ?? ActivityCategory.Transactions,
    );

    useEffect(() => {
        const category = toActivityCategory(initialTab);
        if (category) {
            setSelectedCategory(category);
        }
    }, [initialTab]);

    const handlePauseChange = () => {
        if (paused) {
            toast(`Auto-refreshing on - every ${REFETCH_INTERVAL_SECONDS} seconds`, {
                id: AUTO_REFRESH_ID,
            });
        } else {
            toast('Auto-refresh paused', { id: AUTO_REFRESH_ID });
        }

        setPaused((paused) => !paused);
    };

    const handleCategoryChange = (category: ActivityCategory) => {
        setSelectedCategory(category);
        onCategoryChange?.(category);
    };

    const refetchInterval = paused || !pollingTxnTableEnabled ? undefined : REFETCH_INTERVAL;
    return (
        <Panel>
            <div className="relative flex w-full flex-col justify-between gap-y-lg md:flex-row">
                <SegmentedButton
                    type={SegmentedButtonType.Transparent}
                    shape={ButtonSegmentType.Underlined}
                >
                    {ACTIVITY_CATEGORIES.map(({ label, value }) => (
                        <ButtonSegment
                            key={value}
                            onClick={() => handleCategoryChange(value)}
                            label={label}
                            selected={selectedCategory === value}
                            type={ButtonSegmentType.Underlined}
                        />
                    ))}
                </SegmentedButton>
                {pollingTxnTableEnabled && selectedCategory === ActivityCategory.Transactions && (
                    <div className="flex items-center gap-sm px-md--rs">
                        <Toggle
                            label="Show System Transactions"
                            isToggled={showSystemTransactions}
                            size={ToggleSize.Small}
                            onChange={() => setshowSystemTransactions(!showSystemTransactions)}
                        />
                        <PlayPause paused={paused} onChange={handlePauseChange} />
                    </div>
                )}
            </div>
            <div className="p-md">
                {selectedCategory === ActivityCategory.Transactions && (
                    <TransactionsActivityTable
                        refetchInterval={refetchInterval}
                        initialLimit={initialLimit}
                        disablePagination={disablePagination}
                        transactionKindFilter={
                            showSystemTransactions ? undefined : 'ProgrammableTransaction'
                        }
                    />
                )}
                {selectedCategory === ActivityCategory.Epochs && (
                    <EpochsActivityTable
                        refetchInterval={refetchInterval}
                        initialLimit={initialLimit}
                        disablePagination={disablePagination}
                    />
                )}
                {selectedCategory === ActivityCategory.Checkpoints && (
                    <CheckpointsTable
                        refetchInterval={refetchInterval}
                        initialLimit={initialLimit}
                        disablePagination={disablePagination}
                    />
                )}
            </div>
        </Panel>
    );
}
