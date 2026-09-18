// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { formatAmount, formatBalance, CoinFormat } from '@iota/iota-sdk/utils';
import { LabelTextSize } from '@iota/apps-ui-kit';
import { useGetAllEpochAddressMetrics } from '~/hooks';
import { EPOCH_METRICS_HISTORY_LIMIT } from '~/hooks/useEpochMetricsHistory';
import { StatisticsPanel } from '../StatisticsPanel';
import { GraphTooltipContent } from '../GraphTooltipContent';
import { DateDisplay } from '../DateDisplay';

type NewAccountsPoint = {
    epoch: number;
    timestampMs: number;
    newAccounts: number;
};

function TooltipContent({ data }: { data: NewAccountsPoint }): JSX.Element {
    return (
        <GraphTooltipContent
            overline={
                <>
                    <DateDisplay timestamp={data.timestampMs} type="graph" />
                    {`, Epoch ${data.epoch}`}
                </>
            }
            title={formatAmount(data.newAccounts)}
            subtitle="New Accounts"
        />
    );
}

export function NewAccountsHistoryChart(): JSX.Element {
    const { data: allEpochMetrics, isPending } = useGetAllEpochAddressMetrics({
        descendingOrder: false,
    });

    const chartData = useMemo<NewAccountsPoint[]>(() => {
        const metrics = allEpochMetrics?.slice(-(EPOCH_METRICS_HISTORY_LIMIT + 1)) ?? [];
        const points: NewAccountsPoint[] = [];
        for (let i = 1; i < metrics.length; i++) {
            const newAccounts =
                Number(metrics[i].cumulativeAddresses) - Number(metrics[i - 1].cumulativeAddresses);
            points.push({
                epoch: Number(metrics[i].epoch),
                timestampMs: Number(metrics[i].timestampMs),
                newAccounts: Math.max(newAccounts, 0),
            });
        }
        return points;
    }, [allEpochMetrics]);

    const lastEpochNewAccounts = chartData.at(-1)?.newAccounts;
    const totalNewAccounts = chartData.reduce((sum, point) => sum + point.newAccounts, 0);

    return (
        <StatisticsPanel
            title="New Accounts per Epoch"
            data={chartData}
            isPending={isPending}
            stats={[
                {
                    size: LabelTextSize.Large,
                    label: 'Last Epoch',
                    text:
                        lastEpochNewAccounts !== undefined
                            ? formatBalance(lastEpochNewAccounts, 0, CoinFormat.Rounded)
                            : '--',
                },
                {
                    size: LabelTextSize.Large,
                    label: 'Recent Total',
                    text: chartData.length
                        ? formatBalance(totalNewAccounts, 0, CoinFormat.Rounded)
                        : '--',
                },
            ]}
            getX={({ epoch }) => epoch}
            getY={({ newAccounts }) => newAccounts}
            formatY={formatAmount}
            tooltipContent={TooltipContent}
        />
    );
}
