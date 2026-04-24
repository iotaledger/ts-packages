// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Divider, KeyValueInfo } from '@iota/apps-ui-kit';
import { GAS_SYMBOL } from '../../constants';

interface UnstakeBreakdownProps {
    isPartialUnstake: boolean;
    unstakeAmountFormatted: string;
    rewardsFormatted: string;
    rewardSymbol: string;
    totalUnstakeAmountFormatted: string;
    remainingStakeFormatted: string;
    remainingRewardsFormatted: string;
    remainingRewardsSymbol: string;
    remainingTotalStakedFormatted: string;
}

export function UnstakeBreakdown({
    isPartialUnstake,
    unstakeAmountFormatted,
    rewardsFormatted,
    rewardSymbol,
    totalUnstakeAmountFormatted,
    remainingStakeFormatted,
    remainingRewardsFormatted,
    remainingRewardsSymbol,
    remainingTotalStakedFormatted,
}: UnstakeBreakdownProps) {
    if (isPartialUnstake) {
        return (
            <>
                <KeyValueInfo
                    keyText="Amount to Unstake"
                    value={unstakeAmountFormatted}
                    supportingLabel={GAS_SYMBOL}
                    fullwidth
                />
                <KeyValueInfo
                    keyText="Rewards Earned"
                    value={rewardsFormatted}
                    supportingLabel={rewardSymbol}
                    fullwidth
                />
                <Divider />
                <KeyValueInfo
                    keyText="Remaining Stake"
                    value={remainingStakeFormatted}
                    supportingLabel={GAS_SYMBOL}
                    fullwidth
                />
                <KeyValueInfo
                    keyText="Remaining Rewards"
                    value={remainingRewardsFormatted}
                    supportingLabel={remainingRewardsSymbol}
                    fullwidth
                />
                <Divider />
                <KeyValueInfo
                    keyText="Total Unstaked IOTA"
                    value={totalUnstakeAmountFormatted}
                    supportingLabel={GAS_SYMBOL}
                    fullwidth
                />
                <KeyValueInfo
                    keyText="Remaining Total Staked IOTA"
                    value={remainingTotalStakedFormatted}
                    supportingLabel={GAS_SYMBOL}
                    fullwidth
                />
            </>
        );
    }

    return (
        <>
            <KeyValueInfo
                keyText="Your Stake"
                value={unstakeAmountFormatted}
                supportingLabel={GAS_SYMBOL}
                fullwidth
            />
            <KeyValueInfo
                keyText="Rewards Earned"
                value={rewardsFormatted}
                supportingLabel={rewardSymbol}
                fullwidth
            />
            <Divider />
            <KeyValueInfo
                keyText="Total Unstaked IOTA"
                value={totalUnstakeAmountFormatted}
                supportingLabel={GAS_SYMBOL}
                fullwidth
            />
        </>
    );
}
