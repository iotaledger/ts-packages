// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClientContext } from '@iota/dapp-kit';
import { type Network } from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { useBalanceInUSD } from '../../hooks';
import { CoinFiatValue } from './CoinFiatValue';

export interface AmountWithFiatProps {
    amount: bigint | string | number;
    formatted: string;
    symbol?: string;
    coinType?: string;
}

export function AmountWithFiat({
    amount,
    formatted,
    symbol,
    coinType = IOTA_TYPE_ARG,
}: AmountWithFiatProps) {
    const { network } = useIotaClientContext();
    const value = useBalanceInUSD(coinType, amount, network as Network);
    const hasFiatValue = value !== null && value !== undefined && Math.abs(value) >= 0.005;

    return (
        <span className="flex flex-row flex-wrap items-baseline gap-x-1">
            <span className="whitespace-nowrap">
                {formatted}
                {symbol ? ` ${symbol}` : ''}
            </span>
            {hasFiatValue && (
                <span className="flex flex-row items-baseline gap-1 whitespace-nowrap [&>span]:!text-body-sm">
                    <span className="key-supporting-text-color text-body-sm">~</span>
                    <CoinFiatValue amount={amount} coinType={coinType} withParentheses={false} />
                </span>
            )}
        </span>
    );
}
