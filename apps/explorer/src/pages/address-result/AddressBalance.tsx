// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinFiatValue, IOTA_COIN_METADATA, useCopyToClipboard, useFormatCoin } from '@iota/core';
import { ButtonUnstyled, Panel, Skeleton, Title, TitleSize, Tooltip } from '@iota/apps-ui-kit';
import { Copy, Info } from '@iota/apps-ui-icons';
import { CoinFormat, formatBalance } from '@iota/iota-sdk/utils';
import { onCopySuccess } from '~/lib';
import type { AddressBalanceSummary } from '~/hooks';

const TOOLTIP_TEXT = 'This balance breakdown does not include unmigrated stardust funds.';
const AVAILABLE_TOOLTIP_TEXT = 'IOTA that can be used or transferred immediately.';
const STAKED_TOOLTIP_TEXT =
    'IOTA staked with validators. The secondary figure shows estimated rewards accrued, which are not part of the staked principal. Cannot be used until unstaked.';
const TIMELOCKED_STAKED_TOOLTIP_TEXT =
    'Timelocked IOTA that is currently staked. The secondary figure shows estimated rewards accrued. Cannot be used until unstaked and the timelock expires.';
const TIMELOCKED_TOOLTIP_TEXT =
    "IOTA locked until a specific time. Depending on the lock's expiration, these funds can either be used for staking or collected when the timelock allows it.";

interface AddressBalanceHeroProps {
    summary: AddressBalanceSummary;
}

export function AddressBalanceHero({ summary }: AddressBalanceHeroProps): React.JSX.Element {
    const {
        totalBalance: value,
        isLoadingTotalBalance: isLoading,
        isTotalBalanceErrored: isError,
    } = summary;

    const [roundedAmount] = useFormatCoin({
        balance: value,
    });
    const [fullAmount, symbol] = useFormatCoin({
        balance: value,
        format: CoinFormat.Full,
    });
    const copyToClipboard = useCopyToClipboard(onCopySuccess);

    async function handleCopyClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        await copyToClipboard(formatBalance(value, IOTA_COIN_METADATA.decimals, CoinFormat.Full));
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-xs md:items-end">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-5 w-24" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col gap-xs md:items-end">
                <span className="text-headline-md text-iota-neutral-10 dark:text-iota-neutral-92">
                    --
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-xs md:items-end">
            <div className="flex flex-row items-center gap-x-xs">
                <Tooltip openDelay={100} text={`${fullAmount} ${symbol}`}>
                    <span className="text-headline-md text-iota-neutral-10 dark:text-iota-neutral-92">
                        {roundedAmount} {symbol}
                    </span>
                </Tooltip>
                <ButtonUnstyled onClick={handleCopyClick} aria-label="Copy to clipboard">
                    <Copy className="text-iota-neutral-60 dark:text-iota-neutral-40" />
                </ButtonUnstyled>
                <Tooltip text={TOOLTIP_TEXT}>
                    <Info className="text-iota-neutral-40 dark:text-iota-neutral-60" />
                </Tooltip>
            </div>
            <CoinFiatValue
                amount={value}
                withParentheses={false}
                className="text-body-lg text-iota-neutral-40 dark:text-iota-neutral-60"
            />
        </div>
    );
}

interface AddressBalanceBreakdownProps {
    summary: AddressBalanceSummary;
}

export function AddressBalanceBreakdown({
    summary,
}: AddressBalanceBreakdownProps): React.JSX.Element {
    const {
        availableBalance,
        isLoadingAvailableBalance,
        isAvailableBalanceErrored,
        stakedBalance,
        stakedRewards,
        isLoadingStaked,
        isStakedErrored,
        timelockedStakedBalance,
        timelockedStakedRewards,
        isLoadingTimelockedStaked,
        isTimelockedStakedErrored,
        timelockedBalance,
        isLoadingTimelocked,
        isTimelockedErrored,
    } = summary;

    return (
        <Panel>
            <Title size={TitleSize.Small} title="Balance Breakdown" tooltipText={TOOLTIP_TEXT} />
            <div className="grid grid-cols-1 gap-sm px-md pb-md pt-xs sm:grid-cols-2 lg:grid-cols-4">
                <BalanceTile
                    label="Available"
                    tooltipText={AVAILABLE_TOOLTIP_TEXT}
                    value={availableBalance}
                    isLoading={isLoadingAvailableBalance}
                    isError={isAvailableBalanceErrored}
                />
                <BalanceTile
                    label="Staked"
                    tooltipText={STAKED_TOOLTIP_TEXT}
                    value={stakedBalance}
                    isLoading={isLoadingStaked}
                    isError={isStakedErrored}
                    rewards={stakedRewards}
                />
                <BalanceTile
                    label="Timelocked Staked"
                    tooltipText={TIMELOCKED_STAKED_TOOLTIP_TEXT}
                    value={timelockedStakedBalance}
                    isLoading={isLoadingTimelockedStaked}
                    isError={isTimelockedStakedErrored}
                    rewards={timelockedStakedRewards}
                />
                <BalanceTile
                    label="Timelocked"
                    tooltipText={TIMELOCKED_TOOLTIP_TEXT}
                    value={timelockedBalance}
                    isLoading={isLoadingTimelocked}
                    isError={isTimelockedErrored}
                />
            </div>
        </Panel>
    );
}

interface BalanceTileProps {
    label: string;
    tooltipText?: string;
    value: bigint;
    isLoading?: boolean;
    isError?: boolean;
    rewards?: bigint;
}

function BalanceTile({
    label,
    tooltipText,
    value,
    isLoading,
    isError,
    rewards,
}: BalanceTileProps): React.JSX.Element {
    const [roundedAmount] = useFormatCoin({ balance: value });
    const [fullAmount, symbol] = useFormatCoin({ balance: value, format: CoinFormat.Full });
    const [roundedRewards] = useFormatCoin({ balance: rewards ?? 0n });

    return (
        <div className="flex flex-col gap-xs rounded-xl bg-iota-neutral-96 p-md dark:bg-iota-neutral-10">
            <div className="flex flex-row items-center gap-x-0.5">
                <span className="text-label-lg text-iota-neutral-40 dark:text-iota-neutral-60">
                    {label}
                </span>
                {tooltipText && (
                    <Tooltip text={tooltipText}>
                        <Info className="text-iota-neutral-40 dark:text-iota-neutral-60" />
                    </Tooltip>
                )}
            </div>
            {isLoading ? (
                <Skeleton className="h-6 w-24" />
            ) : isError ? (
                <span className="text-title-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                    --
                </span>
            ) : (
                <div className="flex flex-row flex-wrap items-baseline gap-x-xs">
                    <Tooltip openDelay={100} text={`${fullAmount} ${symbol}`}>
                        <span className="text-title-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                            {roundedAmount} {symbol}
                        </span>
                    </Tooltip>
                    <CoinFiatValue
                        amount={value}
                        withParentheses={false}
                        className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60"
                    />
                </div>
            )}
            {!isLoading && !isError && rewards !== undefined && rewards > 0n && (
                <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                    +{roundedRewards} {symbol} rewards
                </span>
            )}
        </div>
    );
}
