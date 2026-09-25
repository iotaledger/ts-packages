// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { CoinFiatValue } from './CoinFiatValue';

export interface AmountWithFiatProps {
    amount: bigint | string | number;
    formatted?: string;
    symbol?: string;
    coinType?: string;
    direction?: 'row' | 'column';
    showApproxSymbol?: boolean;
    align?: 'start' | 'end';
}

export function AmountWithFiat({
    amount,
    formatted = '',
    symbol,
    coinType = IOTA_TYPE_ARG,
    direction = 'row',
    showApproxSymbol = true,
    align = 'start',
}: AmountWithFiatProps) {
    const alignClass = align === 'end' ? 'items-end justify-end' : 'items-start justify-start';

    return (
        <span
            className={
                direction === 'column'
                    ? `flex flex-col ${alignClass} gap-x-1`
                    : 'flex flex-row flex-wrap items-baseline gap-x-1'
            }
        >
            <span className="whitespace-nowrap">
                {formatted}
                {symbol ? ` ${symbol}` : ''}
            </span>
            <span
                className={`whitespace-nowrap [&>span]:!text-body-sm ${direction === 'column' ? alignClass : ''}`}
            >
                <CoinFiatValue
                    amount={amount}
                    coinType={coinType}
                    withParentheses={false}
                    showApproxSymbol={showApproxSymbol}
                />
            </span>
        </span>
    );
}
