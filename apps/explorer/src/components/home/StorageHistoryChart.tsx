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
    const { storageCharge, storageRebate } = data.endOfEpochInfo;
    const net = BigInt(storageCharge) - BigInt(storageRebate);
    return (
        <GraphTooltipContent
            overline={`${date}, Epoch ${data.epoch}`}
            title={`${formatBalance(storageCharge, IOTA_DECIMALS, CoinFormat.Rounded)} IOTA charged`}
            subtitle={`Rebate ${formatBalance(storageRebate, IOTA_DECIMALS, CoinFormat.Rounded)} · Net ${formatBalance(net, IOTA_DECIMALS, CoinFormat.Rounded, true)} IOTA`}
        />
    );
}

export function StorageHistoryChart(): JSX.Element {
    const { data: completedEpochs, isPending } = useEpochMetricsHistory();

    const { chartData, totalCharge, totalRebate } = useMemo(() => {
        const epochs = completedEpochs ?? [];
        return {
            chartData: sampleEpochs(epochs, EPOCH_METRICS_SAMPLE_INTERVAL),
            totalCharge: epochs.reduce(
                (sum, epoch) => sum + BigInt(epoch.endOfEpochInfo.storageCharge),
                0n,
            ),
            totalRebate: epochs.reduce(
                (sum, epoch) => sum + BigInt(epoch.endOfEpochInfo.storageRebate),
                0n,
            ),
        };
    }, [completedEpochs]);

    return (
        <StatisticsPanel
            title="Storage Charge vs Rebate"
            data={chartData}
            isPending={isPending}
            stats={[
                {
                    size: LabelTextSize.Large,
                    label: 'Total Charge',
                    text: formatBalance(totalCharge, IOTA_DECIMALS, CoinFormat.Rounded),
                    supportingLabel: 'IOTA',
                },
                {
                    size: LabelTextSize.Large,
                    label: 'Total Rebate',
                    text: formatBalance(totalRebate, IOTA_DECIMALS, CoinFormat.Rounded),
                    supportingLabel: 'IOTA',
                },
                {
                    size: LabelTextSize.Large,
                    label: 'Net',
                    text: formatBalance(
                        totalCharge - totalRebate,
                        IOTA_DECIMALS,
                        CoinFormat.Rounded,
                        true,
                    ),
                    supportingLabel: 'IOTA',
                },
            ]}
            getX={({ epoch }) => Number(epoch)}
            getY={({ endOfEpochInfo }) => nanosToIota(endOfEpochInfo.storageCharge)}
            formatY={formatAmount}
            tooltipContent={TooltipContent}
        />
    );
}
