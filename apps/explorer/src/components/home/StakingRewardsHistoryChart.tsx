// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { formatDate } from '@iota/core';
import { formatAmount, formatBalance, CoinFormat, IOTA_DECIMALS } from '@iota/iota-sdk/utils';
import { LabelTextSize } from '@iota/apps-ui-kit';
import { GraphTooltipContent } from '../GraphTooltipContent';
import { StatisticsPanel } from '../StatisticsPanel';
import {
    useEpochMetricsHistory,
    sampleEpochs,
    nanosToIota,
    EPOCH_METRICS_SAMPLE_INTERVAL,
    type CompletedEpochMetrics,
} from '~/hooks';

function TooltipContent({ data }: { data: CompletedEpochMetrics }): JSX.Element {
    const date = formatDate(new Date(Number(data.epochStartTimestamp)), ['day', 'month']);
    const rewards = formatBalance(
        data.endOfEpochInfo.totalStakeRewardsDistributed,
        IOTA_DECIMALS,
        CoinFormat.Rounded,
    );
    return (
        <GraphTooltipContent
            overline={`${date}, Epoch ${data.epoch}`}
            title={`${rewards} IOTA`}
            subtitle="Rewards Distributed"
        />
    );
}

export function StakingRewardsHistoryChart(): JSX.Element {
    const { data: completedEpochs, isPending } = useEpochMetricsHistory();

    const { chartData, totalDistributed } = useMemo(() => {
        const epochs = completedEpochs ?? [];
        return {
            chartData: sampleEpochs(epochs, EPOCH_METRICS_SAMPLE_INTERVAL),
            totalDistributed: epochs.reduce(
                (sum, epoch) => sum + BigInt(epoch.endOfEpochInfo.totalStakeRewardsDistributed),
                0n,
            ),
        };
    }, [completedEpochs]);

    return (
        <StatisticsPanel
            title="Staking Rewards Distributed"
            data={chartData}
            isPending={isPending}
            stats={[
                {
                    size: LabelTextSize.Large,
                    label: 'Total Distributed',
                    text: formatBalance(totalDistributed, IOTA_DECIMALS, CoinFormat.Rounded),
                    supportingLabel: 'IOTA',
                },
            ]}
            getX={({ epoch }) => Number(epoch)}
            getY={({ endOfEpochInfo }) => nanosToIota(endOfEpochInfo.totalStakeRewardsDistributed)}
            formatY={formatAmount}
            tooltipContent={TooltipContent}
        />
    );
}
