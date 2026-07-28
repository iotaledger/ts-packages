// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { formatDate } from '@iota/core';
import { formatAmount } from '@iota/iota-sdk/utils';
import { LabelTextSize } from '@iota/apps-ui-kit';
import { GraphTooltipContent } from '../GraphTooltipContent';
import { StatisticsPanel } from '../StatisticsPanel';
import {
    useEpochMetricsHistory,
    sampleEpochs,
    EPOCH_METRICS_SAMPLE_INTERVAL,
    type CompletedEpochMetrics,
} from '~/hooks';

function TooltipContent({ data }: { data: CompletedEpochMetrics }): JSX.Element {
    const date = formatDate(new Date(Number(data.epochStartTimestamp)), ['day', 'month']);
    return (
        <GraphTooltipContent
            overline={`${date}, Epoch ${data.epoch}`}
            title={`${formatAmount(Number(data.endOfEpochInfo.referenceGasPrice))} NANOS`}
            subtitle="Reference Gas Price"
        />
    );
}

export function GasPriceHistoryChart(): JSX.Element {
    const { data: completedEpochs, isPending } = useEpochMetricsHistory();

    const chartData = useMemo(
        () => sampleEpochs(completedEpochs ?? [], EPOCH_METRICS_SAMPLE_INTERVAL),
        [completedEpochs],
    );

    const latestGasPrice = completedEpochs?.at(-1)?.endOfEpochInfo.referenceGasPrice;

    return (
        <StatisticsPanel
            title="Gas Price History"
            data={chartData}
            isPending={isPending}
            stats={[
                {
                    size: LabelTextSize.Large,
                    label: 'Reference Gas Price',
                    text: latestGasPrice ? formatAmount(Number(latestGasPrice)) : '--',
                    supportingLabel: latestGasPrice ? 'NANOS' : undefined,
                },
            ]}
            getX={({ epoch }) => Number(epoch)}
            getY={({ endOfEpochInfo }) => Number(endOfEpochInfo.referenceGasPrice)}
            formatY={formatAmount}
            tooltipContent={TooltipContent}
        />
    );
}
