// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    CoinFiatValue,
    IOTA_COIN_METADATA,
    useBalance,
    useCopyToClipboard,
    useFormatCoin,
} from '@iota/core';
import { ButtonUnstyled, Skeleton, Tooltip } from '@iota/apps-ui-kit';
import { Copy, Info } from '@iota/apps-ui-icons';
import { CoinFormat, formatBalance } from '@iota/iota-sdk/utils';
import { onCopySuccess } from '~/lib';

const BALANCE_TOOLTIP_TEXT =
    'IOTA that can be used or transferred immediately. Staked and timelocked IOTA are shown in the Staking tab. Does not include unmigrated stardust funds.';

interface AddressBalanceHeroProps {
    address: string;
}

export function AddressBalanceHero({ address }: AddressBalanceHeroProps): React.JSX.Element {
    const { data: balance, isPending, isError } = useBalance(address);
    const value = balance?.totalBalance ? BigInt(balance.totalBalance) : BigInt(0);

    const [fullAmount, symbol] = useFormatCoin({ balance: value, format: CoinFormat.Full });
    const copyToClipboard = useCopyToClipboard(onCopySuccess);

    async function handleCopyClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        await copyToClipboard(formatBalance(value, IOTA_COIN_METADATA.decimals, CoinFormat.Full));
    }

    if (isPending) {
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
        <div className="flex flex-col gap-xxs md:items-end">
            <div className="flex flex-row items-center gap-x-xxs">
                <span className="text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                    IOTA Available Balance
                </span>
                <Tooltip text={BALANCE_TOOLTIP_TEXT}>
                    <Info className="text-iota-neutral-40 dark:text-iota-neutral-60" />
                </Tooltip>
            </div>
            <div className="flex flex-row items-center gap-x-xs">
                <span className="text-headline-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                    {fullAmount} {symbol}
                </span>
                <ButtonUnstyled onClick={handleCopyClick} aria-label="Copy to clipboard">
                    <Copy className="text-iota-neutral-60 dark:text-iota-neutral-40" />
                </ButtonUnstyled>
            </div>
            <CoinFiatValue amount={value} withParentheses={false} />
        </div>
    );
}
