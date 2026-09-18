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
    const fees = formatBalance(data.endOfEpochInfo.totalGasFees, IOTA_DECIMALS, CoinFormat.Rounded);
    return (
        <GraphTooltipContent
            overline={`${date}, Epoch ${data.epoch}`}
            title={`${fees} IOTA`}
            subtitle="Gas Fees Collected"
        />
    );
}

export function GasFeesHistoryChart(): JSX.Element {
    const { data: completedEpochs, isPending } = useEpochMetricsHistory();

    const { chartData, totalFees } = useMemo(() => {
        const epochs = completedEpochs ?? [];
        return {
            chartData: sampleEpochs(epochs, EPOCH_METRICS_SAMPLE_INTERVAL),
            totalFees: epochs.reduce(
                (sum, epoch) => sum + BigInt(epoch.endOfEpochInfo.totalGasFees),
                0n,
            ),
        };
    }, [completedEpochs]);

    return (
        <StatisticsPanel
            title="Gas Fees Collected"
            data={chartData}
            isPending={isPending}
            stats={[
                {
                    size: LabelTextSize.Large,
                    label: 'Total Collected',
                    text: formatBalance(totalFees, IOTA_DECIMALS, CoinFormat.Rounded),
                    supportingLabel: 'IOTA',
                },
            ]}
            getX={({ epoch }) => Number(epoch)}
            getY={({ endOfEpochInfo }) => nanosToIota(endOfEpochInfo.totalGasFees)}
            formatY={formatAmount}
            tooltipContent={TooltipContent}
        />
    );
}
