// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { LabelText, LoadingIndicator, Panel, Title, TitleSize } from '@iota/apps-ui-kit';
import { CoinFiatValue } from '@iota/core';
import type { ComponentProps } from 'react';
import { AreaGraph } from './AreaGraph';
import { ErrorBoundary } from './error-boundary';
import { ParentSize } from '@visx/responsive';

type StatisticsPanelStat = ComponentProps<typeof LabelText> & {
    /** Raw IOTA amount (in nanos) to render a fiat equivalent below the stat value. */
    fiatAmount?: bigint | string | number;
};

type StatisticsPanelProps<T> = {
    title: string;
    data?: ComponentProps<typeof AreaGraph<T>>['data'];
    stats: StatisticsPanelStat[];
    isPending?: boolean;
} & Omit<ComponentProps<typeof AreaGraph<T>>, 'data' | 'width' | 'height'>;

export function StatisticsPanel<T>({
    title,
    data,
    stats,
    isPending,
    getX,
    getY,
    formatX,
    formatY,
    tooltipContent,
}: StatisticsPanelProps<T>): React.JSX.Element {
    return (
        <Panel>
            <Title title={title} size={TitleSize.Medium} />
            <div className="flex h-full flex-col gap-md p-md--rs">
                <div className="grid grid-cols-2 gap-md">
                    {stats.map(({ fiatAmount, ...stat }, index) => (
                        <LabelText
                            key={index}
                            {...stat}
                            text={
                                fiatAmount !== undefined ? (
                                    <div className="flex min-w-0 flex-col gap-xxs">
                                        <div className="flex flex-row flex-wrap items-baseline gap-xxs">
                                            <span className="break-all">{stat.text}</span>
                                            {stat.supportingLabel && (
                                                <span className="whitespace-nowrap break-normal text-label-md opacity-40">
                                                    {stat.supportingLabel}
                                                </span>
                                            )}
                                        </div>
                                        <CoinFiatValue
                                            amount={fiatAmount}
                                            withParentheses={false}
                                        />
                                    </div>
                                ) : (
                                    stat.text
                                )
                            }
                            supportingLabel={
                                fiatAmount !== undefined ? undefined : stat.supportingLabel
                            }
                        />
                    ))}
                </div>

                <div className="mt-auto flex max-h-[270px] min-h-[180px] flex-1 flex-col items-center justify-center rounded-xl transition-colors">
                    {isPending ? (
                        <LoadingIndicator text="Loading data" />
                    ) : data?.length ? (
                        <div className="relative flex-1 self-stretch">
                            <ErrorBoundary>
                                <ParentSize className="absolute">
                                    {({ height, width }) => (
                                        <AreaGraph
                                            data={data}
                                            height={height}
                                            width={width}
                                            getX={getX}
                                            getY={getY}
                                            formatX={formatX}
                                            formatY={formatY}
                                            tooltipContent={tooltipContent}
                                        />
                                    )}
                                </ParentSize>
                            </ErrorBoundary>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center">
                            <span className="flex flex-row items-center gap-x-xs text-iota-neutral-40 dark:text-iota-neutral-60">
                                No historical data available
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </Panel>
    );
}
