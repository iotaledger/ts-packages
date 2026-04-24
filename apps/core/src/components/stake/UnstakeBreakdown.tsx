// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Divider, KeyValueInfo } from '@iota/apps-ui-kit';
import { GAS_SYMBOL } from '../../constants';
import { useFormatCoin } from '../../hooks/useFormatCoin';
import type { UnstakeAmounts } from '../../utils/stake/calculateUnstakeAmounts';

interface UnstakeBreakdownProps {
    isPartialUnstake: boolean;
    unstakeAmounts: UnstakeAmounts;
}

export function UnstakeBreakdown({ isPartialUnstake, unstakeAmounts }: UnstakeBreakdownProps) {
    const [unstakeAmountFormatted] = useFormatCoin({ balance: unstakeAmounts.unstakeAmount });
    const [rewardsFormatted, rewardSymbol] = useFormatCoin({
        balance: unstakeAmounts.proportionalRewards,
    });
    const [totalUnstakeAmountFormatted] = useFormatCoin({
        balance: unstakeAmounts.totalUnstakeAmount,
    });
    const [remainingStakeFormatted] = useFormatCoin({ balance: unstakeAmounts.remainingStake });
    const [remainingRewardsFormatted, remainingRewardsSymbol] = useFormatCoin({
        balance: unstakeAmounts.remainingRewards,
    });
    const [remainingTotalStakedFormatted] = useFormatCoin({
        balance: unstakeAmounts.remainingTotalStaked,
    });

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
