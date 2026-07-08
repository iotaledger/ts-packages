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
    const balance = formatBalance(
        data.endOfEpochInfo.storageFundBalance,
        IOTA_DECIMALS,
        CoinFormat.Rounded,
    );
    return (
        <GraphTooltipContent
            overline={`${date}, Epoch ${data.epoch}`}
            title={`${balance} IOTA`}
            subtitle="Storage Fund Balance"
        />
    );
}

export function StorageFundHistoryChart(): JSX.Element {
    const { data: completedEpochs, isPending } = useEpochMetricsHistory();

    const chartData = useMemo(
        () => sampleEpochs(completedEpochs ?? [], EPOCH_METRICS_SAMPLE_INTERVAL),
        [completedEpochs],
    );

    const latestBalance = completedEpochs?.at(-1)?.endOfEpochInfo.storageFundBalance;

    return (
        <StatisticsPanel
            title="Storage Fund Balance"
            data={chartData}
            isPending={isPending}
            stats={[
                {
                    size: LabelTextSize.Large,
                    label: 'Current Balance',
                    text: latestBalance
                        ? formatBalance(latestBalance, IOTA_DECIMALS, CoinFormat.Rounded)
                        : '--',
                    supportingLabel: latestBalance ? 'IOTA' : undefined,
                },
            ]}
            getX={({ epoch }) => Number(epoch)}
            getY={({ endOfEpochInfo }) => nanosToIota(endOfEpochInfo.storageFundBalance)}
            formatY={formatAmount}
            tooltipContent={TooltipContent}
        />
    );
}
