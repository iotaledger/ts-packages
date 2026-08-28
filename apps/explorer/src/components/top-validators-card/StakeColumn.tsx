// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { TableCellText } from '@iota/apps-ui-kit';
import { CoinFiatValue, useFormatCoin } from '@iota/core';
import { CoinFormat, formatBalance } from '@iota/iota-sdk/utils';

type StakeColumnProps = {
    stake: bigint | number | string;
    hideCoinSymbol?: boolean;
    inNano?: boolean;
};

export function StakeColumn({
    stake,
    hideCoinSymbol,
    inNano = false,
}: StakeColumnProps): JSX.Element {
    const [amount, symbol] = useFormatCoin({ balance: stake, format: CoinFormat.Full });

    const label = inNano ? formatBalance(stake, 0, CoinFormat.Full) : amount;
    const supportingLabel = inNano ? 'nano' : hideCoinSymbol ? undefined : symbol;

    return (
        <span className="flex flex-col whitespace-nowrap">
            <TableCellText supportingLabel={supportingLabel}>{label}</TableCellText>
            {!inNano && <CoinFiatValue amount={stake} withParentheses={false} />}
        </span>
    );
}
