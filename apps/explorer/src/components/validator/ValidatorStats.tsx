// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaValidatorSummary } from '@iota/iota-sdk/client';
import { LabelText, LabelTextSize, Panel, Title, TooltipPosition } from '@iota/apps-ui-kit';
import { CoinFiatValue, getValidatorEffectiveCommission, useFormatCoin } from '@iota/core';
import { EpochStatusIndicator } from '~/pages/validator/ValidatorDetails';

type StatsCardProps = {
    validatorData: IotaValidatorSummary;
    epoch: number | string;
    epochRewards: number | null;
    apy: number | string | null;
    isEarningCurrentEpoch: boolean;
};

export function ValidatorStats({
    validatorData,
    apy,
    isEarningCurrentEpoch,
}: StatsCardProps): JSX.Element {
    const totalStake = Number(validatorData.stakingPoolIotaBalance);

    const effectiveCommissionRate = getValidatorEffectiveCommission(validatorData);
    const rewardsPoolBalance = Number(validatorData.rewardsPool);

    const [formattedTotalStakeAmount, totalStakeSymbol] = useFormatCoin({
        balance: totalStake,
    });
    const [formattedRewardsPoolBalance, rewardsPoolBalanceSymbol] = useFormatCoin({
        balance: rewardsPoolBalance,
    });

    const votingPower = Number(validatorData.votingPower) / 100;
    const commission = Number(validatorData.commissionRate) / 100;

    return (
        <Panel>
            <Title
                title="Current Epoch"
                trailingElement={
                    <EpochStatusIndicator
                        active={isEarningCurrentEpoch}
                        activeLabel="Earning rewards"
                        inactiveLabel="Not earning"
                        tooltipText="Whether this validator is in the active committee and earning staking rewards this epoch."
                    />
                }
            />
            <div className="flex flex-col gap-md p-md">
                <div className="grid grid-cols-1 gap-xl sm:grid-cols-3 md:grid-cols-5">
                    <LabelText
                        label="APY"
                        text={apy === null ? 'N/A' : `${apy}%`}
                        tooltipText="This represents the Annualized Percentage Yield based on the validator's past activities. Keep in mind that this APY may not hold true in the future."
                        tooltipPosition={TooltipPosition.Right}
                        size={LabelTextSize.Large}
                    />
                    <LabelText
                        label="Effective Commission"
                        text={effectiveCommissionRate}
                        supportingLabel={`${commission}%`}
                        tooltipText="The base commission chosen by the validator. Note that the actual commission applied is higher because of the dynamic minimum commission rule (IIP-8)."
                        tooltipPosition={TooltipPosition.Right}
                        size={LabelTextSize.Large}
                    />
                    <LabelText
                        label="Voting Power"
                        text={`${votingPower}%`}
                        tooltipText="Share of total committee voting power held by this validator, proportional to its stake."
                        tooltipPosition={TooltipPosition.Right}
                        size={LabelTextSize.Large}
                    />
                    <LabelText
                        label="Total IOTA Staked"
                        text={
                            <div className="flex min-w-0 flex-col gap-xxs">
                                <div className="flex flex-row flex-wrap items-baseline gap-xxs">
                                    <span className="break-all">{formattedTotalStakeAmount}</span>
                                    <span className="whitespace-nowrap break-normal text-label-md opacity-40">
                                        {totalStakeSymbol}
                                    </span>
                                </div>
                                <CoinFiatValue amount={totalStake} withParentheses={false} />
                            </div>
                        }
                        tooltipText="The total amount of IOTA staked on the network by validators and delegators to secure the network and earn rewards."
                        tooltipPosition={TooltipPosition.Right}
                    />
                    <LabelText
                        label="Reward Balance"
                        text={
                            <div className="flex min-w-0 flex-col gap-xxs">
                                <div className="flex flex-row flex-wrap items-baseline gap-xxs">
                                    <span className="break-all">{formattedRewardsPoolBalance}</span>
                                    <span className="whitespace-nowrap break-normal text-label-md opacity-40">
                                        {rewardsPoolBalanceSymbol}
                                    </span>
                                </div>
                                <CoinFiatValue
                                    amount={rewardsPoolBalance}
                                    withParentheses={false}
                                />
                            </div>
                        }
                        tooltipText={
                            Number(rewardsPoolBalance) <= 0
                                ? 'Coming soon'
                                : 'Accumulated staking rewards that are currently available to withdraw.'
                        }
                        tooltipPosition={TooltipPosition.Right}
                    />
                </div>
            </div>
        </Panel>
    );
}
