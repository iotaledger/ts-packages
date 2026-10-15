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
    LoadingIndicator,
    Panel,
    SegmentedButton,
    SegmentedButtonType,
    LabelText,
    LabelTextSize,
    Badge,
    BadgeType,
} from '@iota/apps-ui-kit';
import { CheckpointsTable, PageLayout, DateDisplay } from '~/components';
import { LinkWithQuery, ProgressBar, TableCard } from '~/components/ui';
import { useEnhancedRpcClient } from '~/hooks/useEnhancedRpc';
import { EpochStats, EpochStatsGrid } from './stats/EpochStats';
import { ValidatorStatus } from './stats/ValidatorStatus';
import { generateValidatorsTableColumns } from '~/lib/ui/utils/generateValidatorsTableColumns';
import { TokenStats } from './stats/TokenStats';
import { getEpochStorageFundFlow, getInternalPath } from '~/lib/utils';
import { ArrowLeft, ArrowRight, Warning } from '@iota/apps-ui-icons';
import { VALIDATORS_EVENTS_QUERY } from '@iota/core';
import { useEndOfEpochTransactionFromCheckpoint } from '~/hooks/useEndOfEpochTransactionFromCheckpoint';
import { type EndOfEpochInfo, type IotaEvent } from '@iota/iota-sdk/client';
import { useIotaClientQuery } from '@iota/dapp-kit';
import { useEpochProgress } from './utils';

import { getSupplyChangeAfterEpochEnd } from '~/lib';

enum EpochTabs {
    Checkpoints = 'checkpoints',
    Validators = 'validators',
}

export function EpochDetail() {
    const [activeTabId, setActiveTabId] = useState(EpochTabs.Checkpoints);
    const { id } = useParams();
    const enhancedRpc = useEnhancedRpcClient();
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

    const isCurrentEpoch = useMemo(
        () => systemState?.epoch === epochData?.epoch,
        [systemState, epochData],
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

    if (isPending) return <PageLayout content={<LoadingIndicator />} />;

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
    const { fundInflow, fundOutflow, netInflow } = getEpochStorageFundFlow(
        epochData.endOfEpochInfo,
    );

    // cursor should be the sequence number of the last checkpoint + 1  if we want to query with desc. order
    const initialCursorPlusOne = epochData.endOfEpochInfo?.lastCheckpointId
        ? (Number(epochData.endOfEpochInfo?.lastCheckpointId) + 1).toString()
        : undefined;

    return (
        <PageLayout
            content={
                <div className="relative">
                    <NavigateEpochButtons
                        epoch={Number(epochData.epoch)}
                        hasNextEpoch={!!epochData?.endOfEpochInfo}
                    />

                    <div className="flex flex-col gap-xl">
                        <div className="pt-md--rs text-display-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                            Epoch
                        </div>

                        <div className="flex flex-col gap-lg">
                            <EpochPageHero
                                epoch={Number(epochData.epoch)}
                                startTimestamp={Number(epochData.epochStartTimestamp)}
                                endOfEpochInfo={epochData.endOfEpochInfo}
                            />

                            {!isCurrentEpoch && (
                                <>
                                    <EpochStats title="Rewards">
                                        <EpochStatsGrid>
                                            <TokenStats
                                                label="Total Stake"
                                                amount={epochData.endOfEpochInfo?.totalStake}
                                            />
                                            <TokenStats
                                                label="Stake Rewards"
                                                amount={
                                                    epochData.endOfEpochInfo
                                                        ?.totalStakeRewardsDistributed
                                                }
                                            />
                                            <TokenStats
                                                label="Gas Fees"
                                                amount={epochData.endOfEpochInfo?.totalGasFees}
                                            />
                                        </EpochStatsGrid>
                                    </EpochStats>

                                    <EpochStats title="Storage Fund Balance">
                                        <EpochStatsGrid>
                                            <TokenStats
                                                label="Fund Size"
                                                amount={
                                                    epochData.endOfEpochInfo?.storageFundBalance
                                                }
                                            />
                                            <TokenStats label="Net Inflow" amount={netInflow} />
                                            <TokenStats label="Fund Inflow" amount={fundInflow} />
                                            <TokenStats label="Fund Outflow" amount={fundOutflow} />
                                        </EpochStatsGrid>
                                    </EpochStats>
                                </>
                            )}

                            {isCurrentEpoch && <ValidatorStatus />}
                        </div>

                        <Panel>
                            <div className="relative">
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
                            </div>
                            <div className="p-md">
                                {activeTabId === EpochTabs.Checkpoints ? (
                                    <CheckpointsTable
                                        initialCursor={initialCursorPlusOne}
                                        maxCursor={epochData.firstCheckpointId}
                                        initialLimit={20}
                                    />
                                ) : null}
                                {activeTabId === EpochTabs.Validators &&
                                committeeMembers &&
                                tableColumns ? (
                                    <TableCard
                                        sortTable
                                        defaultSorting={[
                                            { id: 'stakingPoolIotaBalance', desc: true },
                                        ]}
                                        data={committeeMembers}
                                        columns={tableColumns}
                                        getRowHref={({ iotaAddress }) =>
                                            getInternalPath('validator', iotaAddress)
                                        }
                                    />
                                ) : null}
                            </div>
                        </Panel>
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
        <div className="container fixed left-0 right-0 top-1/2 flex w-full justify-between">
            <div className="bg-page -translate-x-3/4 rounded-full p-1">
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

            <div className="bg-page translate-x-3/4 rounded-full p-1">
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
    epoch: number;
    startTimestamp: number;
    endOfEpochInfo?: EndOfEpochInfo | null;
}
function EpochPageHero({ epoch, startTimestamp, endOfEpochInfo }: EpochPageHeroProps) {
    const { progress, end } = useEpochProgress();

    const epochFinished = !!endOfEpochInfo?.epochEndTimestamp;

    return (
        <Panel>
            <div className="flex flex-col">
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
                            <div className="flex flex-row items-center justify-between">
                                <LabelText
                                    label="Started"
                                    size={LabelTextSize.Medium}
                                    text={
                                        <DateDisplay
                                            timestamp={startTimestamp}
                                            type="epoch"
                                            relativeTimeHelperText="ago"
                                        />
                                    }
                                />

                                <div className="[&>div]:items-end">
                                    <LabelText
                                        label={epochFinished ? 'Ended' : 'Ends'}
                                        size={LabelTextSize.Medium}
                                        text={
                                            <DateDisplay
                                                timestamp={Number(
                                                    endOfEpochInfo?.epochEndTimestamp ?? end,
                                                )}
                                                type="epoch"
                                                relativeTimeHelperText={
                                                    epochFinished ? 'ago' : 'left'
                                                }
                                            />
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {endOfEpochInfo && (
                            <EpochStatsGrid>
                                <>
                                    <TokenStats
                                        label="Burnt Tokens"
                                        size={LabelTextSize.Large}
                                        amount={BigInt(endOfEpochInfo?.burntTokensAmount)}
                                    />
                                    <TokenStats
                                        label="Minted Tokens"
                                        size={LabelTextSize.Large}
                                        amount={BigInt(endOfEpochInfo?.mintedTokensAmount)}
                                    />
                                    <TokenStats
                                        label="Supply Change"
                                        size={LabelTextSize.Large}
                                        amount={getSupplyChangeAfterEpochEnd(endOfEpochInfo)}
                                        showSign
                                    />
                                </>
                            </EpochStatsGrid>
                        )}
                    </div>
                </div>
            </div>
        </Panel>
    );
}
