// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import {
    useGetValidatorStakingHistory,
    type ValidatorEpochInfoEvent,
    formatPercentageDisplay,
    roundFloat,
} from '@iota/core';
import { formatAmount, IOTA_DECIMALS } from '@iota/iota-sdk/utils';
import { InfoBox, InfoBoxStyle, InfoBoxType, LabelTextSize } from '@iota/apps-ui-kit';
import { Warning } from '@iota/apps-ui-icons';
import { StatisticsPanel } from '../StatisticsPanel';
import { GraphTooltipContent } from '../GraphTooltipContent';

interface EpochStakingData {
    epoch: number;
    stake: number;
    rewards: number;
    apy: number;
}

interface TooltipContentProps {
    data: EpochStakingData;
}

function StakeTooltipContent({ data: { epoch, stake } }: TooltipContentProps): JSX.Element {
    return (
        <GraphTooltipContent
            overline={`Epoch ${epoch}`}
            title={`${formatAmount(stake)} IOTA`}
            subtitle="Stake"
        />
    );
}

function RewardsTooltipContent({ data: { epoch, rewards } }: TooltipContentProps): JSX.Element {
    return (
        <GraphTooltipContent
            overline={`Epoch ${epoch}`}
            title={`${formatAmount(rewards)} IOTA`}
            subtitle="Rewards"
        />
    );
}

function ApyTooltipContent({ data: { epoch, apy } }: TooltipContentProps): JSX.Element {
    return <GraphTooltipContent overline={`Epoch ${epoch}`} title={`${apy}%`} subtitle="APY" />;
}

function nanosToIota(value: string): number {
    return Number(value) / Math.pow(10, IOTA_DECIMALS);
}

interface ValidatorStakingHistoryProps {
    validatorAddress: string;
}

export function ValidatorStakingHistory({
    validatorAddress,
}: ValidatorStakingHistoryProps): JSX.Element {
    const {
        data: stakingHistory,
        isPending,
        isError,
    } = useGetValidatorStakingHistory({
        validatorAddress,
    });

    const epochData = useMemo<EpochStakingData[]>(() => {
        if (!stakingHistory) {
            return [];
        }

        return stakingHistory.map((event: ValidatorEpochInfoEvent) => {
            const stake = nanosToIota(event.stake);
            const rewards = nanosToIota(event.pool_staking_reward);
            // Per-epoch staker APY, net of validator commission, matching the node's
            // getValidatorsApy semantics: APY_e = (epoch_rewards / stake) * (1 - commission) * 365
            const commission = Number(event.commission_rate) / 10000;
            const apy =
                stake > 0 ? roundFloat((rewards / stake) * (1 - commission) * 365 * 100, 2) : 0;

            return {
                epoch: Number(event.epoch),
                stake,
                rewards,
                apy,
            };
        });
    }, [stakingHistory]);

    const lastEpochData = epochData[epochData.length - 1];

    if (isError) {
        return (
            <InfoBox
                title="Failed to load staking history"
                supportingText="Something went wrong while fetching the validator's staking history."
                icon={<Warning />}
                type={InfoBoxType.Error}
                style={InfoBoxStyle.Elevated}
            />
        );
    }

    return (
        <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
            <StatisticsPanel
                title="Stake"
                data={epochData}
                isPending={isPending}
                stats={[
                    {
                        size: LabelTextSize.Large,
                        label: 'Last epoch',
                        text: lastEpochData ? `${formatAmount(lastEpochData.stake)} IOTA` : '--',
                    },
                ]}
                getX={({ epoch }) => epoch}
                getY={({ stake }) => stake}
                formatY={formatAmount}
                tooltipContent={StakeTooltipContent}
            />
            <StatisticsPanel
                title="Rewards"
                data={epochData}
                isPending={isPending}
                stats={[
                    {
                        size: LabelTextSize.Large,
                        label: 'Last epoch',
                        text: lastEpochData ? `${formatAmount(lastEpochData.rewards)} IOTA` : '--',
                    },
                ]}
                getX={({ epoch }) => epoch}
                getY={({ rewards }) => rewards}
                formatY={formatAmount}
                tooltipContent={RewardsTooltipContent}
            />
            <StatisticsPanel
                title="APY"
                data={epochData}
                isPending={isPending}
                stats={[
                    {
                        size: LabelTextSize.Large,
                        label: 'Last epoch',
                        text: lastEpochData ? formatPercentageDisplay(lastEpochData.apy) : '--',
                    },
                ]}
                getX={({ epoch }) => epoch}
                getY={({ apy }) => apy}
                formatY={(value) => `${value}%`}
                tooltipContent={ApyTooltipContent}
            />
        </div>
    );
}
