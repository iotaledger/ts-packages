// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { NANOS_PER_IOTA } from '@iota/iota-sdk/utils';
import type { EpochMetrics } from '@iota/iota-sdk/client';

export const EPOCH_METRICS_HISTORY_LIMIT = 100;
export const EPOCH_METRICS_SAMPLE_INTERVAL = 10;

export type CompletedEpochMetrics = EpochMetrics & {
    endOfEpochInfo: NonNullable<EpochMetrics['endOfEpochInfo']>;
};

/**
 * Completed epochs (ascending order) carrying `endOfEpochInfo`, shared across the analytics
 * epoch-history charts so they hit the same react-query cache entry instead of one RPC call each.
 */
export function useEpochMetricsHistory(): UseQueryResult<CompletedEpochMetrics[], Error> {
    const client = useIotaClient();
    return useQuery({
        queryKey: ['epoch-metrics-history', EPOCH_METRICS_HISTORY_LIMIT],
        queryFn: () =>
            client.getEpochMetrics({
                limit: EPOCH_METRICS_HISTORY_LIMIT,
                descendingOrder: true,
            }),
        select: (data) =>
            data.data
                .filter((epoch): epoch is CompletedEpochMetrics => epoch.endOfEpochInfo != null)
                .reverse(),
    });
}

export function sampleEpochs<T extends { epoch: string }>(points: T[], interval: number): T[] {
    return points.filter(
        (point, index) => Number(point.epoch) % interval === 0 || index === points.length - 1,
    );
}

export function nanosToIota(value: string): number {
    return Number(BigInt(value) / NANOS_PER_IOTA);
}
