// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClientContext } from '@iota/dapp-kit';
import { type Network } from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG, formatAmount } from '@iota/iota-sdk/utils';
import { useCoinFiatValue } from '../../hooks';
import { formatFiat } from '../../utils/formatFiat';

export interface CoinFiatValueProps {
    amount: bigint | string | number;
    coinType?: string;
    withParentheses?: boolean;
    showApproxSymbol?: boolean;
    rounded?: boolean;
}

export function CoinFiatValue({
    amount,
    coinType = IOTA_TYPE_ARG,
    withParentheses = true,
    showApproxSymbol = false,
    rounded = false,
}: CoinFiatValueProps): JSX.Element | null {
    const { network } = useIotaClientContext();
    const value = useCoinFiatValue(coinType, amount, network as Network);

    if (value === null || value === undefined) {
        return null;
    }

    const formattedValue = rounded
        ? `$${formatAmount(Math.abs(value))}`
        : formatFiat(Math.abs(value));
    const displayValue = showApproxSymbol ? `~${formattedValue}` : formattedValue;

    return (
        <span className="key-supporting-text-color text-body-sm">
            {withParentheses ? `(${displayValue})` : displayValue}
        </span>
    );
}
