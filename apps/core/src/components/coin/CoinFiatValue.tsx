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
    showApproxSymbol?: boolean;
}

export function CoinFiatValue({
    amount,
    coinType = IOTA_TYPE_ARG,
    withParentheses = true,
    showApproxSymbol = false,
}: CoinFiatValueProps): JSX.Element | null {
    const { network } = useIotaClientContext();
    const value = useBalanceInUSD(coinType, amount, network as Network);

    if (value === null || value === undefined || value === 0) {
        return null;
    }

    const formattedValue = formatBalanceToUSD(value);

    if (showApproxSymbol) {
        return (
            <span className="flex flex-row items-baseline gap-1">
                <span className="key-supporting-text-color text-body-sm">~</span>
                <span className="key-supporting-text-color text-body-sm">
                    {withParentheses ? `(${formattedValue})` : formattedValue}
                </span>
            </span>
        );
    }

    return (
        <span className="key-supporting-text-color text-body-sm">
            {withParentheses ? `(${formattedValue})` : formattedValue}
        </span>
    );
}
