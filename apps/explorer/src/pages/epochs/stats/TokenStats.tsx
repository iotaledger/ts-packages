// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { LabelText, LabelTextSize } from '@iota/apps-ui-kit';
import { CoinFiatValue, useFormatCoin } from '@iota/core';
import { CoinFormat } from '@iota/iota-sdk/utils';

type LabelTextProps = Omit<
    React.ComponentProps<typeof LabelText>,
    'text' | 'size' | 'supportingLabel'
>;

interface TokenStatsProps extends LabelTextProps {
    amount: bigint | number | string | undefined | null;
    showSign?: boolean;
    size?: LabelTextSize;
}

export function TokenStats({
    amount,
    showSign,
    size = LabelTextSize.Large,
    ...props
}: TokenStatsProps): React.JSX.Element {
    const [formattedAmount, symbol] = useFormatCoin({
        balance: amount,
        format: CoinFormat.Full,
        showSign,
    });

    return (
        <LabelText
            text={
                <div className="flex min-w-0 flex-col gap-xxs">
                    <div className="flex flex-row flex-wrap items-baseline gap-xxs">
                        <span className="break-all">{formattedAmount}</span>
                        <span className="whitespace-nowrap break-normal text-label-md opacity-40">
                            {symbol}
                        </span>
                    </div>
                    {amount !== undefined && amount !== null && (
                        <CoinFiatValue amount={amount} withParentheses={false} />
                    )}
                </div>
            }
            size={size}
            {...props}
        />
    );
}
