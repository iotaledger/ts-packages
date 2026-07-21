// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ampli } from '_src/shared/analytics/ampli';
import {
    formatDelegatedStake,
    useFormatCoin,
    useGetDelegatedStake,
    useTotalDelegatedStake,
    DELEGATED_STAKES_QUERY_REFETCH_INTERVAL,
    DELEGATED_STAKES_QUERY_STALE_TIME,
    useBalanceVisible,
    BALANCE_MASK,
    useGetValidatorsApy,
} from '@iota/core';
import { ButtonUnstyled } from '@iota/apps-ui-kit';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from '@iota/apps-ui-icons';
import { useShouldOpenInNewTab } from '_src/ui/app/hooks';
import { openInNewTab } from '_src/shared/utils';

const SOURCE_FLOW = 'Home page';

export function TokenStakingOverview({
    accountAddress,
    disabled,
}: {
    accountAddress: string;
    disabled?: boolean;
}) {
    const navigate = useNavigate();
    const shouldOpenNewTab = useShouldOpenInNewTab();
    const isBalanceVisible = useBalanceVisible();
    const { data: delegatedStake, isPending } = useGetDelegatedStake({
        address: accountAddress,
        staleTime: DELEGATED_STAKES_QUERY_STALE_TIME,
        refetchInterval: DELEGATED_STAKES_QUERY_REFETCH_INTERVAL,
    });

    const delegatedStakes = delegatedStake ? formatDelegatedStake(delegatedStake) : [];
    const totalDelegatedStake = useTotalDelegatedStake(delegatedStakes);
    const [formattedDelegatedStake, symbol, queryResultStake] = useFormatCoin({
        balance: totalDelegatedStake,
    });

    function handleOnClick() {
        ampli.clickedStakeIota({
            isCurrentlyStaking: totalDelegatedStake > 0,
            sourceFlow: SOURCE_FLOW,
        });

        if (shouldOpenNewTab) {
            openInNewTab('/stake');
        } else {
            navigate('/stake');
        }
    }

    const { data: validatorsApy } = useGetValidatorsApy();
    const maxApy = validatorsApy
        ? Math.max(...Object.values(validatorsApy).map(({ apy }) => apy))
        : null;

    const isLoading = isPending || queryResultStake.isPending;
    const isStaking = !isLoading && totalDelegatedStake > 0;

    return (
        <div
            className="group relative w-full cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-iota-primary-30 via-iota-primary-20 via-80% to-iota-primary-10 p-sm transition-all duration-200 hover:brightness-110"
            onClick={!disabled ? handleOnClick : undefined}
        >
            <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-iota-primary-60 opacity-20 blur-lg" />

            <div className="relative z-10 flex items-center justify-between gap-md">
                <div className="flex flex-col gap-xxs">
                    {isStaking ? (
                        <>
                            <span className="text-label-sm text-iota-neutral-80">
                                Current Stake
                            </span>
                            <span className="text-headline-sm text-iota-neutral-96">
                                {isLoading
                                    ? '--'
                                    : `${isBalanceVisible ? formattedDelegatedStake : BALANCE_MASK} ${symbol}`}
                            </span>
                        </>
                    ) : (
                        <span className="text-title-md text-iota-neutral-92">Stake your IOTA</span>
                    )}
                    <TokenStakingAPYInfo isStaking={isStaking} maxApy={maxApy} />
                </div>
                <ButtonUnstyled
                    onClick={handleOnClick}
                    disabled={disabled}
                    className={`flex shrink-0 items-center gap-xxs rounded-2xl p-xs ${isStaking ? '' : ' pl-sm'} text-label-md text-iota-neutral-92 transition-all duration-200`}
                >
                    {!isStaking && 'Start now'}
                    <ArrowRight
                        className={`duration-100 ease-in group-hover:translate-x-1 ${isStaking ? 'h-5 w-5' : 'h-4 w-4'}`}
                    />
                </ButtonUnstyled>
            </div>
        </div>
    );
}

function TokenStakingAPYInfo({
    isStaking,
    maxApy,
}: {
    isStaking: boolean;
    maxApy: number | null;
}): React.ReactElement | null {
    if (maxApy !== null) {
        return (
            <span className="text-body-sm text-iota-neutral-80">
                {isStaking ? 'Earning' : 'Earn'} up to{' '}
                <span className="font-medium text-iota-neutral-96">{maxApy}%</span> APY
            </span>
        );
    }
    if (!isStaking) {
        return (
            <span className="text-body-sm text-iota-neutral-80">
                Delegate your tokens in a few steps and start receiving rewards
            </span>
        );
    }
    return null;
}
