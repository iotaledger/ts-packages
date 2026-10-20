// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { DisplayStats } from '@iota/apps-ui-kit';
import { CoinFiatValue, TruncatedBalance, useFormatCoin } from '@iota/core';
import { IOTA_DECIMALS } from '@iota/iota-sdk/utils';

interface TokenStatsProps {
    label: string;
    amount: bigint | number | string | undefined | null;
    showSign?: boolean;
}

export function TokenStats({ label, amount, showSign }: TokenStatsProps): React.JSX.Element {
    const [, symbol] = useFormatCoin({ balance: amount });

    return (
        <DisplayStats
            label={label}
            value={
                amount === undefined || amount === null ? (
                    '--'
                ) : (
                    <div className="flex flex-col gap-xxs">
                        <div className="flex flex-row flex-wrap items-baseline gap-xxs">
                            <span className="break-all">
                                <TruncatedBalance
                                    balance={amount}
                                    decimals={IOTA_DECIMALS}
                                    symbol={symbol}
                                    showSign={showSign}
                                />
                            </span>
                            <span className="whitespace-nowrap break-normal text-label-md opacity-40">
                                {symbol}
                            </span>
                        </div>
                        <CoinFiatValue amount={amount} withParentheses={false} />
                    </div>
                )
            }
        />
    );
}
