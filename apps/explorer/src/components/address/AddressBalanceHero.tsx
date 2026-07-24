// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinFiatValue, IOTA_COIN_METADATA, useCopyToClipboard, useFormatCoin } from '@iota/core';
import {
    ButtonUnstyled,
    Divider,
    DividerType,
    Skeleton,
    Tooltip,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { Copy, Info, IotaLogoMark, LockLocked, Wallet } from '@iota/apps-ui-icons';
import { CoinFormat, formatBalance } from '@iota/iota-sdk/utils';
import type { ReactNode } from 'react';
import { onCopySuccess } from '~/lib';
import { useAddressBalanceSummary } from '~/hooks';

const TOTAL_TOOLTIP_TEXT =
    'Total IOTA balance, including available, staked, and timelocked funds. Does not include unmigrated stardust funds.';

interface AddressBalanceHeroProps {
    address: string;
}

export function AddressBalanceHero({ address }: AddressBalanceHeroProps): React.JSX.Element {
    const {
        totalBalance,
        isLoadingTotalBalance,
        isTotalBalanceErrored,
        availableBalance,
        timelockedBalance,
    } = useAddressBalanceSummary(address);

    const [totalAmount, symbol] = useFormatCoin({ balance: totalBalance, format: CoinFormat.Full });
    const copyToClipboard = useCopyToClipboard(onCopySuccess);

    async function handleCopyClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        await copyToClipboard(
            formatBalance(totalBalance, IOTA_COIN_METADATA.decimals, CoinFormat.Full),
        );
    }

    if (isLoadingTotalBalance) {
        return (
            <div className="flex w-full flex-col gap-sm md:items-end">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-5 w-24" />
            </div>
        );
    }

    if (isTotalBalanceErrored) {
        return (
            <div className="flex w-full flex-col md:items-end">
                <span className="text-headline-md text-iota-neutral-10 dark:text-iota-neutral-92">
                    --
                </span>
            </div>
        );
    }

    return (
        <div className="flex w-full flex-row items-stretch gap-lg">
            <div className="hidden shrink-0 md:block">
                <Divider type={DividerType.Vertical} />
            </div>
            <div className="flex w-full flex-col items-start gap-xs md:items-end">
                <div className="flex flex-row items-center gap-x-xxs">
                    <span className="text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                        Total balance
                    </span>
                    <Tooltip text={TOTAL_TOOLTIP_TEXT} position={TooltipPosition.Bottom}>
                        <Info className="text-iota-neutral-40 dark:text-iota-neutral-60" />
                    </Tooltip>
                </div>
                <div className="flex flex-row items-center gap-x-xs">
                    <IotaLogoMark className="h-5 w-5 text-iota-neutral-10 dark:text-iota-neutral-92" />
                    <span className="text-title-md text-iota-neutral-10 sm:text-title-lg dark:text-iota-neutral-92">
                        {totalAmount} {symbol}
                    </span>
                    <ButtonUnstyled onClick={handleCopyClick} aria-label="Copy to clipboard">
                        <Copy className="text-iota-neutral-60 dark:text-iota-neutral-40" />
                    </ButtonUnstyled>
                </div>
                <CoinFiatValue amount={totalBalance} withParentheses={false} />

                <div className="my-xs w-full">
                    <Divider />
                </div>

                <div className="flex flex-col items-start gap-xxxs md:items-end">
                    <BalanceRow
                        icon={<Wallet className="h-3.5 w-3.5" />}
                        label="Available"
                        value={availableBalance}
                    />
                    {timelockedBalance > 0n && (
                        <BalanceRow
                            icon={<LockLocked className="h-3.5 w-3.5" />}
                            label="Timelocked"
                            value={timelockedBalance}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

interface BalanceRowProps {
    icon: ReactNode;
    label: string;
    value: bigint;
}

function BalanceRow({ icon, label, value }: BalanceRowProps): JSX.Element {
    const [amount, symbol] = useFormatCoin({ balance: value, format: CoinFormat.Full });

    return (
        <div className="flex flex-row flex-wrap items-center justify-start gap-x-xs md:justify-end">
            <span className="flex flex-row items-center gap-xxs text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                {icon}
                {label}
            </span>
            <span className="flex flex-row items-baseline gap-x-xs">
                <span className="text-label-md text-iota-neutral-10 dark:text-iota-neutral-92">
                    {amount} {symbol}
                </span>
                <span className="[&>span]:!text-body-sm [&>span]:!text-iota-neutral-40 dark:[&>span]:!text-iota-neutral-60">
                    <CoinFiatValue amount={value} withParentheses={false} />
                </span>
            </span>
        </div>
    );
}
