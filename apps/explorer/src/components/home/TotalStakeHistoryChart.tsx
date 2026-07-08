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
    const stake = formatBalance(data.endOfEpochInfo.totalStake, IOTA_DECIMALS, CoinFormat.Rounded);
    return (
        <GraphTooltipContent
            overline={`${date}, Epoch ${data.epoch}`}
            title={`${stake} IOTA`}
            subtitle="Total Stake"
        />
    );
}

export function TotalStakeHistoryChart(): JSX.Element {
    const { data: completedEpochs, isPending } = useEpochMetricsHistory();

    const chartData = useMemo(
        () => sampleEpochs(completedEpochs ?? [], EPOCH_METRICS_SAMPLE_INTERVAL),
        [completedEpochs],
    );

    const latestTotalStake = completedEpochs?.at(-1)?.endOfEpochInfo.totalStake;

    return (
        <StatisticsPanel
            title="Total Stake History"
            data={chartData}
            isPending={isPending}
            stats={[
                {
                    size: LabelTextSize.Large,
                    label: 'Total Staked',
                    text: latestTotalStake
                        ? formatBalance(latestTotalStake, IOTA_DECIMALS, CoinFormat.Rounded)
                        : '--',
                    supportingLabel: latestTotalStake ? 'IOTA' : undefined,
                },
            ]}
            getX={({ epoch }) => Number(epoch)}
            getY={({ endOfEpochInfo }) => nanosToIota(endOfEpochInfo.totalStake)}
            formatY={formatAmount}
            tooltipContent={TooltipContent}
        />
    );
}
