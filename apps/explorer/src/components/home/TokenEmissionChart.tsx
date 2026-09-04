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
    const { mintedTokensAmount, burntTokensAmount } = data.endOfEpochInfo;
    const net = BigInt(mintedTokensAmount) - BigInt(burntTokensAmount);
    return (
        <GraphTooltipContent
            overline={`${date}, Epoch ${data.epoch}`}
            title={`${formatBalance(mintedTokensAmount, IOTA_DECIMALS, CoinFormat.Rounded)} IOTA minted`}
            subtitle={`Burnt ${formatBalance(burntTokensAmount, IOTA_DECIMALS, CoinFormat.Rounded)} · Net ${formatBalance(net, IOTA_DECIMALS, CoinFormat.Rounded, true)} IOTA`}
        />
    );
}

export function TokenEmissionChart(): JSX.Element {
    const { data: completedEpochs, isPending } = useEpochMetricsHistory();

    const { chartData, totalMinted, totalBurnt } = useMemo(() => {
        const epochs = completedEpochs ?? [];
        return {
            chartData: sampleEpochs(epochs, EPOCH_METRICS_SAMPLE_INTERVAL),
            totalMinted: epochs.reduce(
                (sum, epoch) => sum + BigInt(epoch.endOfEpochInfo.mintedTokensAmount),
                0n,
            ),
            totalBurnt: epochs.reduce(
                (sum, epoch) => sum + BigInt(epoch.endOfEpochInfo.burntTokensAmount),
                0n,
            ),
        };
    }, [completedEpochs]);

    return (
        <StatisticsPanel
            title="Token Emission (Mint vs Burn)"
            data={chartData}
            isPending={isPending}
            stats={[
                {
                    size: LabelTextSize.Large,
                    label: 'Total Minted',
                    text: formatBalance(totalMinted, IOTA_DECIMALS, CoinFormat.Rounded),
                    supportingLabel: 'IOTA',
                },
                {
                    size: LabelTextSize.Large,
                    label: 'Total Burnt',
                    text: formatBalance(totalBurnt, IOTA_DECIMALS, CoinFormat.Rounded),
                    supportingLabel: 'IOTA',
                },
                {
                    size: LabelTextSize.Large,
                    label: 'Net',
                    text: formatBalance(
                        totalMinted - totalBurnt,
                        IOTA_DECIMALS,
                        CoinFormat.Rounded,
                        true,
                    ),
                    supportingLabel: 'IOTA',
                },
            ]}
            getX={({ epoch }) => Number(epoch)}
            getY={({ endOfEpochInfo }) => nanosToIota(endOfEpochInfo.mintedTokensAmount)}
            formatY={formatAmount}
            tooltipContent={TooltipContent}
        />
    );
}
