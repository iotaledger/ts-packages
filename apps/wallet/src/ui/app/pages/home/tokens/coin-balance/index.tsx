// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import { CoinFiatValue, useBalanceInUSD, useFormatCoin, BALANCE_MASK } from '@iota/core';
import { CoinFormat, formatBalance } from '@iota/iota-sdk/utils';
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
    coinType: string;
    isVisible: boolean;
}

function WalletBalanceUsd({ amount: walletBalance, coinType, isVisible }: WalletBalanceUsdProps) {
    const network = useAppSelector((state) => state.app.network);
    const usdValue = useBalanceInUSD(coinType, walletBalance, network);

    if (usdValue === null || usdValue === undefined || Math.abs(usdValue) < 0.005) {
        return null;
    }

    return (
        <div className="flex items-center gap-1 text-label-md text-iota-neutral-40 dark:text-iota-neutral-60 [&>span]:!text-label-md">
            {isVisible ? (
                <>
                    <span>~</span>
                    <CoinFiatValue
                        amount={walletBalance}
                        coinType={coinType}
                        withParentheses={false}
                    />
                    <span>USD</span>
                </>
            ) : (
                <span>{BALANCE_MASK}</span>
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
        <div
            className="text-headline-lg text-iota-neutral-10 dark:text-iota-neutral-92"
            data-testid="coin-balance"
        >
            {isBalanceVisible ? formatted : BALANCE_MASK}
        </div>
    );

    return (
        <div className="flex flex-col gap-xxs">
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
            <WalletBalanceUsd amount={walletBalance} coinType={type} isVisible={isBalanceVisible} />
        </div>
    );
}
