// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import { formatBalanceToUSD, useBalanceInUSD, useFormatCoin, BALANCE_MASK } from '@iota/core';
import { IOTA_TYPE_ARG, CoinFormat, formatBalance } from '@iota/iota-sdk/utils';
import { useMemo } from 'react';
import { Button, ButtonSize, ButtonType, Tooltip, TooltipPosition } from '@iota/apps-ui-kit';
import BigNumber from 'bignumber.js';
import { useAppSelector, useBalanceVisibility } from '_src/ui/app/hooks';
import { VisibilityOff, VisibilityOn } from '@iota/apps-ui-icons';

export interface CoinProps {
    type: string;
    amount: bigint;
}

interface WalletBalanceUsdProps {
    amount: bigint;
    isVisible: boolean;
}

function WalletBalanceUsd({ amount: walletBalance, isVisible }: WalletBalanceUsdProps) {
    const network = useAppSelector((state) => state.app.network);
    const formattedWalletBalance = useBalanceInUSD(IOTA_TYPE_ARG, walletBalance, network);

    const walletBalanceInUsd = useMemo(() => {
        if (!formattedWalletBalance) return null;

        return `~${formatBalanceToUSD(formattedWalletBalance)} USD`;
    }, [formattedWalletBalance]);

    if (!walletBalanceInUsd) {
        return null;
    }

    return (
        <div className="relative text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
            <span className={isVisible ? '' : 'invisible'}>{walletBalanceInUsd}</span>
            {!isVisible && (
                <span className="absolute inset-0 flex items-center">{BALANCE_MASK}</span>
            )}
        </div>
    );
}

export function CoinBalance({ amount: walletBalance, type }: CoinProps) {
    const [formatted, symbol, { data: coinMetadata }] = useFormatCoin({
        balance: walletBalance,
        coinType: type,
    });
    const { isBalanceVisible, toggleBalanceVisible } = useBalanceVisibility();

    const iotaDecimals = coinMetadata?.decimals ?? 9;
    const bnBalance = new BigNumber(walletBalance.toString()).shiftedBy(-1 * iotaDecimals);
    const shouldShowTooltip = bnBalance.gt(0) && bnBalance.lt(1);

    const balanceNode = (
        <div className="relative">
            <span
                className={`text-headline-lg text-iota-neutral-10 dark:text-iota-neutral-92 ${!isBalanceVisible ? 'invisible' : ''}`}
                data-testid="coin-balance"
            >
                {formatted}
            </span>
            {!isBalanceVisible && (
                <span className="absolute inset-0 flex items-baseline text-headline-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                    {BALANCE_MASK}
                </span>
            )}
        </div>
    );

    return (
        <>
            <div className="flex items-baseline gap-0.5">
                {shouldShowTooltip && isBalanceVisible ? (
                    <Tooltip
                        text={formatBalance(
                            walletBalance,
                            coinMetadata?.decimals ?? 9,
                            CoinFormat.Full,
                        )}
                        position={TooltipPosition.Bottom}
                    >
                        {balanceNode}
                    </Tooltip>
                ) : (
                    balanceNode
                )}
                <div className="flex items-center gap-xxs text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                    {symbol}
                    <Button
                        type={ButtonType.Ghost}
                        size={ButtonSize.Small}
                        onClick={toggleBalanceVisible}
                        className="flex items-center text-iota-neutral-40 transition-colors hover:text-iota-neutral-10 dark:text-iota-neutral-60 dark:hover:text-iota-neutral-92"
                        aria-label={isBalanceVisible ? 'Hide balances' : 'Show balances'}
                        icon={
                            isBalanceVisible ? (
                                <VisibilityOn className="h-4 w-4" />
                            ) : (
                                <VisibilityOff className="h-4 w-4" />
                            )
                        }
                    />
                </div>
            </div>
            <WalletBalanceUsd amount={walletBalance} isVisible={isBalanceVisible} />
        </>
    );
}
