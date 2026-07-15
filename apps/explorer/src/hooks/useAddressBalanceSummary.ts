// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    formatDelegatedStake,
    formatDelegatedTimelockedStake,
    mapTimelockObjects,
    TIMELOCK_IOTA_TYPE,
    useBalance,
    useGetAllOwnedObjects,
    useGetDelegatedStake,
    useGetTimelockedStakedObjects,
    useTotalDelegatedRewards,
    useTotalDelegatedStake,
} from '@iota/core';

export interface AddressBalanceSummary {
    totalBalance: bigint;
    isLoadingTotalBalance: boolean;
    isTotalBalanceErrored: boolean;

    availableBalance: bigint;
    isLoadingAvailableBalance: boolean;
    isAvailableBalanceErrored: boolean;

    stakedBalance: bigint;
    stakedRewards: bigint;
    isLoadingStaked: boolean;
    isStakedErrored: boolean;

    timelockedStakedBalance: bigint;
    timelockedStakedRewards: bigint;
    isLoadingTimelockedStaked: boolean;
    isTimelockedStakedErrored: boolean;

    timelockedBalance: bigint;
    isLoadingTimelocked: boolean;
    isTimelockedErrored: boolean;
}

export function useAddressBalanceSummary(address: string): AddressBalanceSummary {
    const {
        data: balance,
        isLoading: isLoadingBalance,
        isError: isBalanceErrored,
    } = useBalance(address);
    const availableBalance = balance?.totalBalance ? BigInt(balance.totalBalance) : BigInt(0);

    const {
        data: delegatedStake,
        isLoading: isLoadingDelegatedStakes,
        isError: isDelegatedStakeErrored,
    } = useGetDelegatedStake({
        address,
    });
    const delegatedStakes = delegatedStake ? formatDelegatedStake(delegatedStake) : [];
    const totalDelegatedStake = useTotalDelegatedStake(delegatedStakes);
    const totalDelegatedStakeRewards = useTotalDelegatedRewards(delegatedStakes);

    const {
        data: timelockedStakedObjects,
        isLoading: isLoadingTimelockedStakeObjects,
        isError: isTimelockedStakedObjectsErrored,
    } = useGetTimelockedStakedObjects(address);

    const extendedDelegatedTimelockedStakes = formatDelegatedTimelockedStake(
        timelockedStakedObjects || [],
    );

    const totalTimelockedStaked = useTotalDelegatedStake(extendedDelegatedTimelockedStakes);
    const totalTimelockedStakedRewards = useTotalDelegatedRewards(
        extendedDelegatedTimelockedStakes,
    );

    const {
        data: timelockedObjects,
        isLoading: isTimelockedObjectsLoading,
        isError: isTimelockedObjectsError,
    } = useGetAllOwnedObjects(address, {
        StructType: TIMELOCK_IOTA_TYPE,
    });

    const mappedTimelockedObjects = mapTimelockObjects(timelockedObjects || []);

    const totalTimelockedTokens = mappedTimelockedObjects.reduce(
        (acc, obj) => acc + BigInt(obj.locked.value),
        BigInt(0),
    );

    const totalBalance =
        BigInt(balance?.totalBalance || 0) +
        BigInt(totalDelegatedStake || 0) +
        BigInt(totalTimelockedStaked || 0) +
        BigInt(totalTimelockedTokens || 0);

    const isLoadingTotalBalance =
        isLoadingBalance ||
        isLoadingDelegatedStakes ||
        isLoadingTimelockedStakeObjects ||
        isTimelockedObjectsLoading;

    const isTotalBalanceErrored =
        isBalanceErrored ||
        isDelegatedStakeErrored ||
        isTimelockedStakedObjectsErrored ||
        isTimelockedObjectsError;

    return {
        totalBalance,
        isLoadingTotalBalance,
        isTotalBalanceErrored,

        availableBalance,
        isLoadingAvailableBalance: isLoadingBalance,
        isAvailableBalanceErrored: isBalanceErrored,

        stakedBalance: totalDelegatedStake,
        stakedRewards: totalDelegatedStakeRewards,
        isLoadingStaked: isLoadingDelegatedStakes,
        isStakedErrored: isDelegatedStakeErrored,

        timelockedStakedBalance: totalTimelockedStaked,
        timelockedStakedRewards: totalTimelockedStakedRewards,
        isLoadingTimelockedStaked: isLoadingTimelockedStakeObjects,
        isTimelockedStakedErrored: isTimelockedStakedObjectsErrored,

        timelockedBalance: totalTimelockedTokens,
        isLoadingTimelocked: isTimelockedObjectsLoading,
        isTimelockedErrored: isTimelockedObjectsError,
    };
}
