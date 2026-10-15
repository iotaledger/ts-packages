// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Button,
    ButtonSegment,
    ButtonSegmentType,
    ButtonSize,
    ButtonType,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    Panel,
    SegmentedButton,
    SegmentedButtonType,
    LabelText,
    LabelTextSize,
    Badge,
    BadgeType,
} from '@iota/apps-ui-kit';
import { CheckpointsTable, PageLayout, DateDisplay } from '~/components';
import { LinkWithQuery, PlayPause, ProgressBar, TableCard } from '~/components/ui';
import { AUTO_REFRESH_INTERVAL, useAutoRefresh, useBreakpoint } from '~/hooks';
import { useEnhancedRpcClient } from '~/hooks/useEnhancedRpc';
import { EpochValidatorSet } from './stats/EpochValidatorSet';
import { EpochDetailSkeleton } from './EpochDetailSkeleton';
import { generateValidatorsTableColumns } from '~/lib/ui/utils/generateValidatorsTableColumns';
import { TokenStats } from './stats/TokenStats';
import { getEpochStorageFundFlow, getInternalPath } from '~/lib/utils';
import { ArrowLeft, ArrowRight, Warning } from '@iota/apps-ui-icons';
import { VALIDATORS_EVENTS_QUERY } from '@iota/core';
import { useEndOfEpochTransactionFromCheckpoint } from '~/hooks/useEndOfEpochTransactionFromCheckpoint';
import { type EndOfEpochInfo, type EpochInfo, type IotaEvent } from '@iota/iota-sdk/client';
import { useIotaClientQuery } from '@iota/dapp-kit';
import { useEpochProgress } from './utils';
import { getSupplyChangeAfterEpochEnd } from '~/lib';
import { CoinFormat, formatBalance } from '@iota/iota-sdk/utils';

enum EpochTabs {
    Checkpoints = 'checkpoints',
    Validators = 'validators',
}

export function EpochDetail() {
    const [activeTabId, setActiveTabId] = useState(EpochTabs.Checkpoints);
    const { id } = useParams();
    const enhancedRpc = useEnhancedRpcClient();
    const { paused, togglePaused } = useAutoRefresh();
    const { data: systemState } = useIotaClientQuery('getLatestIotaSystemState');
    const { data, isPending, isError } = useQuery({
        queryKey: ['epoch', id],
        queryFn: async () =>
            enhancedRpc.getEpochs({
                // todo: endpoint returns no data for epoch 0
                cursor: id === '0' ? undefined : (Number(id!) - 1).toString(),
                limit: 1,
            }),
    });

    const [epochData] = data?.data ?? [];

    const endOfPreviousEpochCheckpoint = epochData?.firstCheckpointId
        ? (Number(epochData.firstCheckpointId) - 1).toString()
        : undefined;
    const { data: endOfEpochTransaction } = useEndOfEpochTransactionFromCheckpoint(
        endOfPreviousEpochCheckpoint,
    );
    const validatorEvents: IotaEvent[] | undefined = endOfEpochTransaction?.events?.filter(
        (event): event is IotaEvent => event.type === VALIDATORS_EVENTS_QUERY,
    );

    const committeeMembers =
        epochData?.committeeMembers?.map(
            (committeeMemberIndex) => epochData.validators[Number(committeeMemberIndex)],
        ) ?? [];

    const tableColumns = useMemo(() => {
        if (!epochData?.validators || epochData.validators.length === 0) return null;
        const includeColumns = [
            'Validator',
            'Stake',
            'APY',
            'Effective Commission',
            'Last Epoch Rewards',
            'Voting Power',
            'Status',
        ];

        // todo: enrich this historical validator data when we have
        // at-risk / pending validators for historical epochs
        return generateValidatorsTableColumns({
            committeeMembers: committeeMembers.map((member) => member.iotaAddress),
            validatorEvents: validatorEvents ?? [],
            showValidatorIcon: true,
            includeColumns,
            currentEpoch: epochData.epoch,
        });
        // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [epochData, validatorEvents, committeeMembers]);

    if (isPending)
        return (
            <EpochPageLayout epoch={Number(id)}>
                <EpochDetailSkeleton showEndOfEpochStats={systemState?.epoch !== id} />
            </EpochPageLayout>
        );

    if (isError || !epochData)
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Failed to load epoch data"
                        supportingText={`There was an issue retrieving data for epoch ${id}`}
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );

    // cursor should be the sequence number of the last checkpoint + 1  if we want to query with desc. order
    const initialCursorPlusOne = epochData.endOfEpochInfo?.lastCheckpointId
        ? (Number(epochData.endOfEpochInfo?.lastCheckpointId) + 1).toString()
        : undefined;

    const isOngoing = !epochData.endOfEpochInfo;
    const refetchInterval = isOngoing && !paused ? AUTO_REFRESH_INTERVAL : undefined;

    return (
        <EpochPageLayout epoch={Number(epochData.epoch)} hasNextEpoch={!isOngoing}>
            <div className="flex flex-col gap-lg">
                <EpochPageHero epochInfo={epochData} refetchInterval={refetchInterval} />

                <EpochValidatorSet
                    validators={epochData.validators}
                    committeeMembers={committeeMembers}
                />

                {epochData.endOfEpochInfo && (
                    <EpochEndStats endOfEpochInfo={epochData.endOfEpochInfo} />
                )}
            </div>

            <Panel>
                <div className="relative flex flex-row items-center justify-between">
                    <SegmentedButton
                        type={SegmentedButtonType.Transparent}
                        shape={ButtonSegmentType.Underlined}
                    >
                        <ButtonSegment
                            type={ButtonSegmentType.Underlined}
                            label="Checkpoints"
                            selected={activeTabId === EpochTabs.Checkpoints}
                            onClick={() => setActiveTabId(EpochTabs.Checkpoints)}
                        />
                        <ButtonSegment
                            type={ButtonSegmentType.Underlined}
                            label="Participating Validators"
                            selected={activeTabId === EpochTabs.Validators}
                            onClick={() => setActiveTabId(EpochTabs.Validators)}
                        />
                    </SegmentedButton>
                    {isOngoing && activeTabId === EpochTabs.Checkpoints && (
                        <div className="px-md--rs">
                            <PlayPause paused={paused} onChange={togglePaused} />
                        </div>
                    )}
                </div>
                <div className="p-md">
                    {activeTabId === EpochTabs.Checkpoints ? (
                        <CheckpointsTable
                            refetchInterval={refetchInterval}
                            initialCursor={initialCursorPlusOne}
                            maxCursor={epochData.firstCheckpointId}
                            initialLimit={20}
                        />
                    ) : null}
                    {activeTabId === EpochTabs.Validators && committeeMembers && tableColumns ? (
                        <TableCard
                            sortTable
                            defaultSorting={[{ id: 'stakingPoolIotaBalance', desc: true }]}
                            data={committeeMembers}
                            columns={tableColumns}
                            getRowHref={({ iotaAddress }) =>
                                getInternalPath('validator', iotaAddress)
                            }
                        />
                    ) : null}
                </div>
            </Panel>
        </EpochPageLayout>
    );
}

interface EpochPageLayoutProps {
    epoch: number;
    hasNextEpoch?: boolean;
}

function EpochPageLayout({
    epoch,
    hasNextEpoch,
    children,
}: React.PropsWithChildren<EpochPageLayoutProps>) {
    return (
        <PageLayout
            content={
                <div className="relative">
                    <NavigateEpochButtons epoch={epoch} hasNextEpoch={hasNextEpoch} />
                    <div className="flex flex-col gap-xl">
                        <div className="pt-md--rs text-display-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                            Epoch
                        </div>
                        {children}
                    </div>
                </div>
            }
        />
    );
}

interface NavigateEpochButtonsProps {
    epoch: number;
    hasNextEpoch?: boolean;
}
function NavigateEpochButtons({ epoch, hasNextEpoch }: NavigateEpochButtonsProps) {
    return (
        <div className="container pointer-events-none fixed left-0 right-0 top-1/2 flex w-full justify-between">
            <div className="bg-page pointer-events-auto -translate-x-3/4 rounded-full p-1">
                <LinkWithQuery to={`/epoch/${epoch - 1}`}>
                    <Button
                        type={ButtonType.Secondary}
                        size={ButtonSize.Medium}
                        icon={<ArrowLeft className="size-5" />}
                        disabled={epoch === 0}
                        aria-label="Go to previous epoch"
                    />
                </LinkWithQuery>
            </div>

            <div className="bg-page pointer-events-auto translate-x-3/4 rounded-full p-1">
                <LinkWithQuery to={`/epoch/${epoch + 1}`}>
                    <Button
                        type={ButtonType.Secondary}
                        size={ButtonSize.Medium}
                        icon={<ArrowRight className="size-5" />}
                        disabled={!hasNextEpoch}
                        aria-label="Go to next epoch"
                    />
                </LinkWithQuery>
            </div>
        </div>
    );
}

interface EpochPageHeroProps {
    epochInfo: EpochInfo;
    refetchInterval?: number;
}

function EpochPageHero({ epochInfo, refetchInterval }: EpochPageHeroProps) {
    const { progress, end } = useEpochProgress();
    const isDesktop = useBreakpoint('sm');
    const dateSize = isDesktop ? LabelTextSize.Medium : LabelTextSize.Small;
    const { data: systemState } = useIotaClientQuery('getLatestIotaSystemState');
    const { endOfEpochInfo } = epochInfo;
    const epoch = Number(epochInfo.epoch);
    const startTimestamp = Number(epochInfo.epochStartTimestamp);
    const epochFinished = !!endOfEpochInfo?.epochEndTimestamp;

    const { data: latestCheckpoint } = useIotaClientQuery(
        'getLatestCheckpointSequenceNumber',
        undefined,
        { enabled: !epochFinished, refetchInterval },
    );
    const protocolVersion = endOfEpochInfo?.protocolVersion ?? systemState?.protocolVersion;
    const lastCheckpoint = endOfEpochInfo?.lastCheckpointId ?? latestCheckpoint;
    const referenceGasPrice = endOfEpochInfo?.referenceGasPrice ?? epochInfo.referenceGasPrice;

    const stats = [
        { label: 'Protocol version', value: protocolVersion ? `v${protocolVersion}` : '--' },
        {
            label: 'Checkpoints',
            value: (
                <>
                    <CheckpointLink sequenceNumber={epochInfo.firstCheckpointId} />
                    {' → '}
                    {lastCheckpoint ? <CheckpointLink sequenceNumber={lastCheckpoint} /> : '--'}
                </>
            ),
        },
        {
            label: 'Transactions',
            value: epochFinished
                ? formatBalance(epochInfo.epochTotalTransactions, 0, CoinFormat.Full)
                : '--',
        },
        {
            label: 'Reference gas price',
            value:
                referenceGasPrice != null
                    ? `${formatBalance(referenceGasPrice, 0, CoinFormat.Full)} nanos`
                    : '--',
        },
    ];

    return (
        <Panel>
            <div className="flex flex-col px-md">
                <div className="flex w-full flex-col gap-xs p-md--rs">
                    <div className="flex w-full flex-row items-center justify-center pt-md">
                        <Badge
                            type={epochFinished ? BadgeType.Success : BadgeType.Neutral}
                            label={epochFinished ? 'Completed' : 'In Progress'}
                        />
                    </div>
                    <div className="flex flex-col gap-xl">
                        <h2 className="title-main-color flex w-full flex-col gap-xxxs text-center">
                            <span className="text-7xl text-display-lg">{epoch + 1}</span>
                        </h2>
                        <div className="flex flex-col gap-lg">
                            <ProgressBar
                                progress={endOfEpochInfo ? 100 : progress || 0}
                                size="large"
                            />
                            <div className="flex flex-row items-start justify-between gap-md">
                                <div className="min-w-0">
                                    <LabelText
                                        label="Started"
                                        size={dateSize}
                                        text={
                                            <DateDisplay
                                                timestamp={startTimestamp}
                                                type="epoch"
                                                relativeTimeHelperText="ago"
                                                allowWrap
                                            />
                                        }
                                    />
                                </div>

                                <div className="min-w-0 text-right [&>div]:items-end">
                                    <LabelText
                                        label={epochFinished ? 'Ended' : 'Ends'}
                                        size={dateSize}
                                        text={
                                            <DateDisplay
                                                timestamp={Number(
                                                    endOfEpochInfo?.epochEndTimestamp ?? end,
                                                )}
                                                type="epoch"
                                                relativeTimeHelperText={
                                                    epochFinished ? 'ago' : 'left'
                                                }
                                                allowWrap
                                            />
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-md gap-y-md pb-md sm:flex sm:flex-row sm:justify-center sm:gap-x-2xl">
                            {stats.map(({ label, value }) => (
                                <div
                                    key={label}
                                    className="flex flex-col items-center gap-xxs text-center"
                                >
                                    <span className="text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                                        {label}
                                    </span>
                                    <span className="text-body-md text-iota-neutral-10 dark:text-iota-neutral-92">
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

function CheckpointLink({ sequenceNumber }: { sequenceNumber: string }) {
    return (
        <LinkWithQuery
            to={getInternalPath('checkpoint', sequenceNumber)}
            className="text-iota-primary-30 hover:underline dark:text-iota-primary-80"
        >
            {formatBalance(sequenceNumber, 0, CoinFormat.Full)}
        </LinkWithQuery>
    );
}

function EpochEndStats({ endOfEpochInfo }: { endOfEpochInfo: EndOfEpochInfo }) {
    const { fundInflow, fundOutflow, netInflow } = getEpochStorageFundFlow(endOfEpochInfo);

    return (
        <div className="flex flex-col gap-md--rs">
            <div className="grid grid-cols-1 gap-md--rs sm:grid-cols-2 md:grid-cols-3">
                <TokenStats label="Burnt Tokens" amount={endOfEpochInfo.burntTokensAmount} />
                <TokenStats label="Minted Tokens" amount={endOfEpochInfo.mintedTokensAmount} />
                <TokenStats
                    label="Supply Change"
                    amount={getSupplyChangeAfterEpochEnd(endOfEpochInfo)}
                    showSign
                />
                <TokenStats label="Total Stake" amount={endOfEpochInfo.totalStake} />
                <TokenStats
                    label="Stake Rewards"
                    amount={endOfEpochInfo.totalStakeRewardsDistributed}
                />
                <TokenStats label="Gas Fees" amount={endOfEpochInfo.totalGasFees} />
            </div>
            <div className="grid grid-cols-1 gap-md--rs sm:grid-cols-2 md:grid-cols-4">
                <TokenStats label="Storage Fund Size" amount={endOfEpochInfo.storageFundBalance} />
                <TokenStats label="Storage Fund Net Inflow" amount={netInflow} />
                <TokenStats label="Storage Fund Inflow" amount={fundInflow} />
                <TokenStats label="Storage Fund Outflow" amount={fundOutflow} />
            </div>
        </div>
    );
}
