// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClientContext } from '@iota/dapp-kit';
import { type Network } from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { useBalanceInUSD } from '../../hooks';
import { formatBalanceToUSD } from '../../utils/formatBalanceToUSD';

export interface CoinFiatValueProps {
    amount: bigint | string | number;
    coinType?: string;
    className?: string;
    withParentheses?: boolean;
}

/**
 * Renders the fiat (USD) value of a coin amount.
 *
 * Renders nothing when fiat conversion is unavailable (feature-gated to mainnet)
 * or when the resulting value is below one cent.
 */
export function CoinFiatValue({
    amount,
    coinType = IOTA_TYPE_ARG,
    className = 'text-body-md text-iota-neutral-40 dark:text-iota-neutral-60',
    withParentheses = true,
}: CoinFiatValueProps): JSX.Element | null {
    const { network } = useIotaClientContext();
    const value = useBalanceInUSD(coinType, amount, network as Network);

    if (value === null || value === undefined || Math.abs(value) < 0.005) {
        return null;
    }

    const formattedValue = formatBalanceToUSD(Math.abs(value));

    return (
        <span className={className}>
            {withParentheses ? `(${formattedValue})` : formattedValue}
        </span>
    );
}
