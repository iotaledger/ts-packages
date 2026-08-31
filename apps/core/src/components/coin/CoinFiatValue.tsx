// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClientContext } from '@iota/dapp-kit';
import { type Network } from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { useBalanceInUSD } from '../../hooks';
import { formatBalanceToUSD } from '../../utils/formatBalanceToUSD';

export interface CoinFiatValueProps {
    amount: bigint | string | number;
    coinType?: string;
    withParentheses?: boolean;
}

export function CoinFiatValue({
    amount,
    coinType = IOTA_TYPE_ARG,
    withParentheses = true,
}: CoinFiatValueProps): JSX.Element | null {
    const { network } = useIotaClientContext();
    const value = useBalanceInUSD(coinType, amount, network as Network);

    if (value === null || value === undefined || Math.abs(value) < 0.005) {
        return null;
    }

    const formattedValue = formatBalanceToUSD(value);

    return (
        <span className="text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
            {withParentheses ? `(${formattedValue})` : formattedValue}
        </span>
    );
}
