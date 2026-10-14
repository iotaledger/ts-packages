// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Tooltip } from '@iota/apps-ui-kit';
import { CoinFormat, formatBalance } from '@iota/iota-sdk/utils';
import BigNumber from 'bignumber.js';

export interface TruncatedBalanceProps {
    balance: bigint | number | string;
    decimals: number;
    symbol?: string;
    showSign?: boolean;
}

export function TruncatedBalance({ balance, decimals, symbol, showSign }: TruncatedBalanceProps) {
    const full = formatBalance(balance, decimals, CoinFormat.Full, showSign);

    if (new BigNumber(balance.toString()).shiftedBy(-decimals).abs().lt(1)) return <>{full}</>;

    const truncated = formatBalance(balance, decimals, CoinFormat.TruncatedDecimals, showSign);

    if (truncated === full) return <>{truncated}</>;

    return (
        <Tooltip text={symbol ? `${full} ${symbol}` : full} maxWidth="max-w-[400px]">
            <span>{truncated}</span>
        </Tooltip>
    );
}
