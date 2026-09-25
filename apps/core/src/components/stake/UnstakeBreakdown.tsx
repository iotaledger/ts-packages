// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Divider, KeyValueInfo } from '@iota/apps-ui-kit';
import { GAS_SYMBOL } from '../../constants';
import { useFormatCoin } from '../../hooks/useFormatCoin';
import type { UnstakeAmounts } from '../../utils/stake/calculateUnstakeAmounts';
import { AmountWithFiat } from '../coin';

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
                    value={
                        <AmountWithFiat
                            formatted={unstakeAmountFormatted}
                            symbol={GAS_SYMBOL}
                            amount={unstakeAmounts.unstakeAmount}
                        />
                    }
                    fullwidth
                />
                <KeyValueInfo
                    keyText="Rewards Earned"
                    value={
                        <AmountWithFiat
                            formatted={rewardsFormatted}
                            symbol={rewardSymbol}
                            amount={unstakeAmounts.proportionalRewards}
                        />
                    }
                    fullwidth
                />
                <Divider />
                <KeyValueInfo
                    keyText="Remaining Stake"
                    value={
                        <AmountWithFiat
                            formatted={remainingStakeFormatted}
                            symbol={GAS_SYMBOL}
                            amount={unstakeAmounts.remainingStake}
                        />
                    }
                    fullwidth
                />
                <KeyValueInfo
                    keyText="Remaining Rewards"
                    value={
                        <AmountWithFiat
                            formatted={remainingRewardsFormatted}
                            symbol={remainingRewardsSymbol}
                            amount={unstakeAmounts.remainingRewards}
                        />
                    }
                    fullwidth
                />
                <Divider />
                <KeyValueInfo
                    keyText="Total Unstaked IOTA"
                    value={
                        <AmountWithFiat
                            formatted={totalUnstakeAmountFormatted}
                            symbol={GAS_SYMBOL}
                            amount={unstakeAmounts.totalUnstakeAmount}
                        />
                    }
                    fullwidth
                />
                <KeyValueInfo
                    keyText="Remaining Total Staked IOTA"
                    value={
                        <AmountWithFiat
                            formatted={remainingTotalStakedFormatted}
                            symbol={GAS_SYMBOL}
                            amount={unstakeAmounts.remainingTotalStaked}
                        />
                    }
                    fullwidth
                />
            </>
        );
    }

    return (
        <>
            <KeyValueInfo
                keyText="Your Stake"
                value={
                    <AmountWithFiat
                        formatted={unstakeAmountFormatted}
                        symbol={GAS_SYMBOL}
                        amount={unstakeAmounts.unstakeAmount}
                    />
                }
                fullwidth
            />
            <KeyValueInfo
                keyText="Rewards Earned"
                value={
                    <AmountWithFiat
                        formatted={rewardsFormatted}
                        symbol={rewardSymbol}
                        amount={unstakeAmounts.proportionalRewards}
                    />
                }
                fullwidth
            />
            <Divider />
            <KeyValueInfo
                keyText="Total Unstaked IOTA"
                value={
                    <AmountWithFiat
                        formatted={totalUnstakeAmountFormatted}
                        symbol={GAS_SYMBOL}
                        amount={unstakeAmounts.totalUnstakeAmount}
                    />
                }
                fullwidth
            />
        </>
    );
}
