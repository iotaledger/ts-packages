// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react';
import { useIotaClient, useIotaClientQuery } from '@iota/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import {
    formatBalance,
    CoinFormat,
    IOTA_DECIMALS,
    IOTA_TYPE_ARG,
    NANOS_PER_IOTA,
} from '@iota/iota-sdk/utils';
import { formatDate } from '@iota/core';
import type { EpochMetrics } from '@iota/iota-sdk/client';
import { GraphTooltipContent } from '../GraphTooltipContent';
import { Sparkline } from '../Sparkline';
import { ParentSize } from '@visx/responsive';

const X_AXIS_INTERVAL = 10;
const EPOCHS_LIMIT = X_AXIS_INTERVAL * 10;
const Y_AXIS_ZOOM_FACTOR = 0.2;

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
    const client = useIotaClient();

    const { data: epochMetrics } = useQuery({
        queryKey: ['epoch-metrics', 'supply-history', EPOCHS_LIMIT],
        queryFn: () => client.getEpochMetrics({ limit: EPOCHS_LIMIT, descendingOrder: true }),
    });

    const { data: totalSupply } = useIotaClientQuery('getTotalSupply', { coinType: IOTA_TYPE_ARG });

    const { chartData, yDomain } = useMemo(() => {
        const empty = {
            chartData: [] as EpochSupplyPoint[],
            yDomain: undefined as [number, number] | undefined,
        };
        if (!epochMetrics?.data || !totalSupply?.value) return empty;

        type CompletedEpoch = EpochMetrics & {
            endOfEpochInfo: NonNullable<EpochMetrics['endOfEpochInfo']>;
        };

        // Only completed epochs carry endOfEpochInfo; flip to ascending order.
        const completed = epochMetrics.data
            .filter((e): e is CompletedEpoch => e.endOfEpochInfo != null)
            .reverse();

        if (completed.length === 0) return empty;

        // current total supply ≈ supply at the end of the most recent completed epoch.
        let supply = BigInt(totalSupply.value);
        const allPoints: EpochSupplyPoint[] = new Array(completed.length);

        for (let i = completed.length - 1; i >= 0; i--) {
            allPoints[i] = {
                epoch: completed[i].epoch,
                epochStartTimestamp: completed[i].epochStartTimestamp,
                supplyNanos: supply,
            };
            if (i > 0) {
                supply =
                    supply -
                    BigInt(completed[i].endOfEpochInfo.mintedTokensAmount) +
                    BigInt(completed[i].endOfEpochInfo.burntTokensAmount);
            }
        }

        const sampled = allPoints.filter(
            (p, i) => Number(p.epoch) % X_AXIS_INTERVAL === 0 || i === allPoints.length - 1,
        );

        const yValues = sampled.map((p) => Number(p.supplyNanos / NANOS_PER_IOTA));
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        const yRange = yMax - yMin || 1;
        const yPad = yRange * Y_AXIS_ZOOM_FACTOR;

        return {
            chartData: sampled,
            yDomain: [yMin - yPad, yMax + yPad] as [number, number],
        };
    }, [epochMetrics, totalSupply]);

    return (
        <ParentSize className="absolute py-sm">
            {({ height, width }) => (
                <Sparkline
                    data={chartData}
                    width={width}
                    height={height}
                    getX={({ epoch }) => Number(epoch)}
                    getY={({ supplyNanos }) => Number(supplyNanos / NANOS_PER_IOTA)}
                    yDomain={yDomain}
                    tooltipContent={TooltipContent}
                />
            )}
        </ParentSize>
    );
}
