// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { useIotaClientQuery } from '@iota/dapp-kit';
import {
    LabelText,
    LabelTextSize,
    Panel,
    Skeleton,
    Title,
    TitleSize,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { ProgressBar, LinkWithQuery } from '~/components/ui';
import { useGetNetworkMetrics } from '~/hooks';
import { useEpochProgress } from '~/pages/epochs/utils';
import { ArrowTopRight } from '@iota/apps-ui-icons';

const CHECKPOINT_REFETCH_INTERVAL = 5 * 1000;

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function useCountdownHHMMSS(endMs: number): string | null {
    const [remaining, setRemaining] = useState<number | null>(null);

    useEffect(() => {
        if (!endMs) {
            setRemaining(null);
            return;
        }
        setRemaining(Math.max(0, endMs - Date.now()));
        const id = setInterval(() => {
            setRemaining(Math.max(0, endMs - Date.now()));
        }, 1000);
        return () => clearInterval(id);
    }, [endMs]);

    if (remaining === null) return null;

    const totalSeconds = Math.floor(remaining / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function EpochHeroCard(): JSX.Element {
    const { epoch, progress, end } = useEpochProgress();
    const { data: networkData } = useGetNetworkMetrics({
        refetchInterval: CHECKPOINT_REFETCH_INTERVAL,
        staleTime: CHECKPOINT_REFETCH_INTERVAL,
    });
    const { data: systemData } = useIotaClientQuery('getLatestIotaSystemState');
    const { data: binaryVersion } = useIotaClientQuery('getRpcApiVersion');

    const countdown = useCountdownHHMMSS(end ?? 0);
    const progressPct = progress ?? 0;
    const isLoading = countdown === null;

    const checkpoint = networkData?.currentCheckpoint
        ? BigInt(networkData.currentCheckpoint).toLocaleString()
        : '--';

    const protocolVersion = systemData?.protocolVersion ?? '--';

    return (
        <LinkWithQuery className="flex w-full" to={`/epoch/${epoch}`}>
            <Panel>
                <div className="group relative px-md--rs py-sm--rs">
                    <Title title={`Epoch ${epoch ?? '--'}`} size={TitleSize.Medium} />
                    <ArrowTopRight className="dark:iota-neutral-60 absolute right-4 top-4 size-6 text-iota-neutral-40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    <div className="flex flex-col gap-md p-md--rs">
                        <div className="flex items-baseline gap-xxs">
                            <div className="font-alliance-no2 text-display-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                                {isLoading ? (
                                    <Skeleton className="h-[1lh] w-60 rounded-xl" />
                                ) : (
                                    countdown
                                )}
                            </div>
                            <div className="inline-block text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                                {isLoading ? (
                                    <Skeleton className="h-[1lh] !w-20 rounded-md" />
                                ) : (
                                    'remaining'
                                )}
                            </div>
                        </div>

                        <ProgressBar progress={progressPct} />

                        <div className="flex flex-wrap gap-md pt-xs">
                            <div className="min-w-0 flex-1">
                                <LabelText
                                    size={LabelTextSize.Small}
                                    label="Checkpoint"
                                    text={checkpoint}
                                    tooltipPosition={TooltipPosition.Top}
                                    tooltipText="The most recent checkpoint sequence number recorded by the network."
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <LabelText
                                    size={LabelTextSize.Small}
                                    label="Protocol"
                                    text={protocolVersion}
                                    supportingLabel={
                                        binaryVersion ? `v${binaryVersion}` : undefined
                                    }
                                    tooltipPosition={TooltipPosition.Top}
                                    tooltipText="The protocol version currently run by the network, and the binary version of the RPC node."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>
        </LinkWithQuery>
    );
}
