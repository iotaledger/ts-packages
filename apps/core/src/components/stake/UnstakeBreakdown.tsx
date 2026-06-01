// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Divider, KeyValueInfo } from '@iota/apps-ui-kit';
import { GAS_SYMBOL } from '../../constants';
import { useFormatCoin } from '../../hooks/useFormatCoin';
import { useBalanceVisible, BALANCE_MASK } from '../../contexts/BalanceVisibilityContext';
import type { UnstakeAmounts } from '../../utils/stake/calculateUnstakeAmounts';

interface UnstakeBreakdownProps {
    isPartialUnstake: boolean;
    unstakeAmounts: UnstakeAmounts;
}

export function UnstakeBreakdown({ isPartialUnstake, unstakeAmounts }: UnstakeBreakdownProps) {
    const isBalanceVisible = useBalanceVisible();
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

    const mask = BALANCE_MASK;

    if (isPartialUnstake) {
        return (
            <>
                <KeyValueInfo
                    keyText="Amount to Unstake"
                    value={isBalanceVisible ? unstakeAmountFormatted : mask}
                    supportingLabel={isBalanceVisible ? GAS_SYMBOL : undefined}
                    fullwidth
                />
                <KeyValueInfo
                    keyText="Rewards Earned"
                    value={isBalanceVisible ? rewardsFormatted : mask}
                    supportingLabel={isBalanceVisible ? rewardSymbol : undefined}
                    fullwidth
                />
                <Divider />
                <KeyValueInfo
                    keyText="Remaining Stake"
                    value={isBalanceVisible ? remainingStakeFormatted : mask}
                    supportingLabel={isBalanceVisible ? GAS_SYMBOL : undefined}
                    fullwidth
                />
                <KeyValueInfo
                    keyText="Remaining Rewards"
                    value={isBalanceVisible ? remainingRewardsFormatted : mask}
                    supportingLabel={isBalanceVisible ? remainingRewardsSymbol : undefined}
                    fullwidth
                />
                <Divider />
                <KeyValueInfo
                    keyText="Total Unstaked IOTA"
                    value={isBalanceVisible ? totalUnstakeAmountFormatted : mask}
                    supportingLabel={isBalanceVisible ? GAS_SYMBOL : undefined}
                    fullwidth
                />
                <KeyValueInfo
                    keyText="Remaining Total Staked IOTA"
                    value={isBalanceVisible ? remainingTotalStakedFormatted : mask}
                    supportingLabel={isBalanceVisible ? GAS_SYMBOL : undefined}
                    fullwidth
                />
            </>
        );
    }

    return (
        <>
            <KeyValueInfo
                keyText="Your Stake"
                value={isBalanceVisible ? unstakeAmountFormatted : mask}
                supportingLabel={isBalanceVisible ? GAS_SYMBOL : undefined}
                fullwidth
            />
            <KeyValueInfo
                keyText="Rewards Earned"
                value={isBalanceVisible ? rewardsFormatted : mask}
                supportingLabel={isBalanceVisible ? rewardSymbol : undefined}
                fullwidth
            />
            <Divider />
            <KeyValueInfo
                keyText="Total Unstaked IOTA"
                value={isBalanceVisible ? totalUnstakeAmountFormatted : mask}
                supportingLabel={isBalanceVisible ? GAS_SYMBOL : undefined}
                fullwidth
            />
        </>
    );
}
