// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { useIotaClientQuery } from '@iota/dapp-kit';
import {
    Divider,
    LabelText,
    LabelTextSize,
    Panel,
    Title,
    TitleSize,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import {
    formatPercentageDisplay,
    roundFloat,
    useFormatCoin,
    useGetValidatorsApy,
    useMaxCommitteeSize,
} from '@iota/core';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';

// Scale before the BigInt division so the percentage keeps two decimal places,
// then divide the resulting Number by the divisor to get the final value.
const STAKING_RATIO_SCALE = 10_000n;
const STAKING_RATIO_DIVISOR = 100;

export function StakingHeroCard(): JSX.Element {
    const { data } = useIotaClientQuery('getLatestIotaSystemState');
    const { data: totalSupplyData } = useIotaClientQuery('getTotalSupply', {
        coinType: IOTA_TYPE_ARG,
    });
    const { data: validatorsApy } = useGetValidatorsApy();
    const { data: participationMetrics } = useIotaClientQuery('getParticipationMetrics');

    const totalStaked = data
        ? data.committeeMembers.reduce((acc, cur) => acc + BigInt(cur.stakingPoolIotaBalance), 0n)
        : 0n;

    const stakingRatioPct =
        totalSupplyData?.value && totalStaked
            ? Number((totalStaked * STAKING_RATIO_SCALE) / BigInt(totalSupplyData.value)) /
              STAKING_RATIO_DIVISOR
            : null;

    const averageAPY = useMemo(() => {
        if (!validatorsApy || Object.keys(validatorsApy).length === 0) return null;
        if (Object.values(validatorsApy).every(({ isApyApproxZero }) => isApyApproxZero))
            return '~0';
        const apys = Object.values(validatorsApy).filter((a) => a.apy > 0 && !a.isApyApproxZero);
        const avg = apys.reduce((acc, cur) => acc + cur.apy, 0);
        return apys.length > 0 ? roundFloat(avg / apys.length) : 0;
    }, [validatorsApy]);

    const [formattedStaked, stakedSymbol] = useFormatCoin({ balance: totalStaked });

    const { data: maxCommitteeSize } = useMaxCommitteeSize();
    const committeeCount = data?.committeeMembers?.length ?? 0;
    const pendingCount = Number(data?.pendingActiveValidatorsSize ?? 0);
    const activeAndPendingCount = (data?.activeValidators?.length ?? 0) + pendingCount;

    const apyDisplay = averageAPY !== null ? `${averageAPY}%` : '--';
    const delegatorsDisplay = participationMetrics?.totalAddresses ?? '--';

    return (
        <Panel>
            <div className="px-md--rs py-sm--rs">
                <Title title="Staking" size={TitleSize.Medium} />
            </div>
            <div className="flex flex-col gap-md p-md--rs">
                <div className="flex flex-wrap gap-md">
                    <div className="min-w-0 flex-1">
                        <LabelText
                            size={LabelTextSize.Large}
                            label="Total Staked"
                            text={formattedStaked ?? '--'}
                            supportingLabel={formattedStaked ? stakedSymbol : undefined}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="The total amount of IOTA currently staked with validators."
                        />
                        {stakingRatioPct !== null && (
                            <span className="text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                                {formatPercentageDisplay(stakingRatioPct)} of supply
                            </span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <LabelText
                            size={LabelTextSize.Large}
                            label="Avg APY"
                            text={apyDisplay}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="The average annual percentage yield earned by validators across the network."
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <LabelText
                            size={LabelTextSize.Large}
                            label="Delegators"
                            text={String(delegatorsDisplay)}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="The total number of addresses currently delegating stake to validators."
                        />
                    </div>
                </div>

                <Divider />

                <div className="flex flex-wrap gap-md">
                    <div className="min-w-0 flex-1">
                        <LabelText
                            size={LabelTextSize.Large}
                            label="Validators"
                            text={String(activeAndPendingCount || '--')}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="The total number of active and pending validators on the network."
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <LabelText
                            size={LabelTextSize.Large}
                            label="In Committee"
                            text={String(committeeCount || '--')}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="The number of validators currently part of the consensus committee."
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <LabelText
                            size={LabelTextSize.Large}
                            label="Max Committee Size"
                            text={maxCommitteeSize !== undefined ? String(maxCommitteeSize) : '--'}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="The maximum number of validators allowed in the consensus committee."
                        />
                    </div>
                </div>
            </div>
        </Panel>
    );
}
