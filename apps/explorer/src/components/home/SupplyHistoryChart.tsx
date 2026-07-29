// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react';
import { useIotaClientQuery } from '@iota/dapp-kit';
import {
    formatAmount,
    formatBalance,
    CoinFormat,
    IOTA_DECIMALS,
    IOTA_TYPE_ARG,
} from '@iota/iota-sdk/utils';
import { formatDate } from '@iota/core';
import { LabelTextSize } from '@iota/apps-ui-kit';
import { GraphTooltipContent } from '../GraphTooltipContent';
import { StatisticsPanel } from '../StatisticsPanel';
import {
    useEpochMetricsHistory,
    sampleEpochs,
    nanosToIota,
    EPOCH_METRICS_SAMPLE_INTERVAL,
} from '~/hooks';

type EpochSupplyPoint = {
    epoch: string;
    epochStartTimestamp: string;
    supplyNanos: bigint;
};

function TooltipContent({ data }: { data: EpochSupplyPoint }): JSX.Element {
    const date = formatDate(new Date(Number(data.epochStartTimestamp)), ['day', 'month']);
    const supply = formatBalance(data.supplyNanos.toString(), IOTA_DECIMALS, CoinFormat.Rounded);
    return (
        <GraphTooltipContent
            overline={`${date}, Epoch ${data.epoch}`}
            title={`${supply} IOTA`}
            subtitle="Total Supply"
        />
    );
}

export function SupplyHistoryChart(): React.JSX.Element {
    const { data: completedEpochs, isPending } = useEpochMetricsHistory();
    const { data: totalSupply } = useIotaClientQuery('getTotalSupply', { coinType: IOTA_TYPE_ARG });

    const chartData = useMemo(() => {
        if (!completedEpochs?.length || !totalSupply?.value) return [] as EpochSupplyPoint[];

        // current total supply ≈ supply at the end of the most recent completed epoch.
        let supply = BigInt(totalSupply.value);
        const allPoints: EpochSupplyPoint[] = new Array(completedEpochs.length);

        for (let i = completedEpochs.length - 1; i >= 0; i--) {
            allPoints[i] = {
                epoch: completedEpochs[i].epoch,
                epochStartTimestamp: completedEpochs[i].epochStartTimestamp,
                supplyNanos: supply,
            };
            if (i > 0) {
                supply =
                    supply -
                    BigInt(completedEpochs[i].endOfEpochInfo.mintedTokensAmount) +
                    BigInt(completedEpochs[i].endOfEpochInfo.burntTokensAmount);
            }
        }

        return sampleEpochs(allPoints, EPOCH_METRICS_SAMPLE_INTERVAL);
    }, [completedEpochs, totalSupply]);

    const totalSupplyFormatted = totalSupply?.value
        ? formatBalance(totalSupply.value, IOTA_DECIMALS, CoinFormat.Rounded)
        : '--';

    return (
        <StatisticsPanel
            title="Historical Supply"
            data={chartData}
            isPending={isPending}
            stats={[
                {
                    size: LabelTextSize.Large,
                    label: 'Total Supply',
                    text: totalSupplyFormatted,
                    supportingLabel: totalSupply?.value ? 'IOTA' : undefined,
                },
            ]}
            getX={({ epoch }) => Number(epoch)}
            getY={({ supplyNanos }) => nanosToIota(supplyNanos.toString())}
            formatY={formatAmount}
            tooltipContent={TooltipContent}
        />
    );
}
