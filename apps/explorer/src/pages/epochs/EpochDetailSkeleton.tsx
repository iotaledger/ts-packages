// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    ButtonSegment,
    ButtonSegmentType,
    Panel,
    SegmentedButton,
    SegmentedButtonType,
    Skeleton,
    Title,
} from '@iota/apps-ui-kit';
import { PlaceholderTable } from '~/components/ui';

const HERO_STATS = 4;
const VALIDATOR_COUNTS = 3;
const LEGEND_ITEMS = 7;
const END_OF_EPOCH_STATS_ROWS = [3, 3, 4];
const CHECKPOINTS_COLUMNS = ['Digest', 'Sequence Number', 'Transactions', 'Time'];

const range = (length: number) => Array.from({ length }, (_, index) => index);

interface EpochDetailSkeletonProps {
    showEndOfEpochStats: boolean;
}

export function EpochDetailSkeleton({ showEndOfEpochStats }: EpochDetailSkeletonProps) {
    return (
        <div className="flex flex-col gap-lg">
            <Panel>
                <div className="flex flex-col items-center gap-xl p-md--rs pt-lg">
                    <Skeleton className="!h-6 !w-24" />
                    <Skeleton className="!h-16 !w-40 !rounded-xl" />
                    <Skeleton className="!h-3" />
                    <div className="flex w-full flex-row justify-between">
                        <DatePlaceholder />
                        <DatePlaceholder alignEnd />
                    </div>
                    <div className="grid w-full grid-cols-2 gap-md pb-md sm:flex sm:flex-row sm:justify-center sm:gap-x-xl">
                        {range(HERO_STATS).map((index) => (
                            <div key={index} className="flex flex-col items-center gap-xs">
                                <Skeleton className="!h-3 !w-20" />
                                <Skeleton className="!h-4 !w-24" />
                            </div>
                        ))}
                    </div>
                </div>
            </Panel>

            <Panel>
                <Title title="Validator Set" />
                <div className="flex flex-col gap-lg p-md--rs md:flex-row md:justify-between">
                    <div className="flex flex-row flex-wrap gap-xl">
                        {range(VALIDATOR_COUNTS).map((index) => (
                            <div key={index} className="flex flex-col gap-xs">
                                <Skeleton className="!h-7 !w-12 !rounded-md" />
                                <Skeleton className="!h-3 !w-28" />
                            </div>
                        ))}
                    </div>
                    <div className="flex w-full flex-col gap-sm md:max-w-[50%]">
                        <Skeleton className="!h-3 !w-40" />
                        <Skeleton className="!h-3" />
                        <div className="grid grid-cols-1 gap-x-md gap-y-xs sm:grid-cols-2 lg:grid-cols-3">
                            {range(LEGEND_ITEMS).map((index) => (
                                <Skeleton key={index} className="my-xxxs !h-3" />
                            ))}
                        </div>
                    </div>
                </div>
            </Panel>

            {showEndOfEpochStats && (
                <div className="flex flex-col gap-md--rs">
                    {END_OF_EPOCH_STATS_ROWS.map((columns, row) => (
                        <div
                            key={row}
                            className={
                                columns === 4
                                    ? 'grid grid-cols-1 gap-md--rs sm:grid-cols-2 md:grid-cols-4'
                                    : 'grid grid-cols-1 gap-md--rs sm:grid-cols-2 md:grid-cols-3'
                            }
                        >
                            {range(columns).map((index) => (
                                <Skeleton key={index} className="!h-28 !rounded-2xl" />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            <Panel>
                <SegmentedButton
                    type={SegmentedButtonType.Transparent}
                    shape={ButtonSegmentType.Underlined}
                >
                    <ButtonSegment
                        type={ButtonSegmentType.Underlined}
                        label="Checkpoints"
                        selected
                        disabled
                    />
                    <ButtonSegment
                        type={ButtonSegmentType.Underlined}
                        label="Participating Validators"
                        disabled
                    />
                </SegmentedButton>
                <div className="p-md">
                    <PlaceholderTable
                        rowCount={20}
                        rowHeight="16px"
                        colHeadings={CHECKPOINTS_COLUMNS}
                    />
                </div>
            </Panel>
        </div>
    );
}

function DatePlaceholder({ alignEnd }: { alignEnd?: boolean }) {
    return (
        <div className={alignEnd ? 'flex flex-col items-end gap-xs' : 'flex flex-col gap-xs'}>
            <Skeleton className="!h-4 !w-28" />
            <Skeleton className="!h-3 !w-14" />
        </div>
    );
}
