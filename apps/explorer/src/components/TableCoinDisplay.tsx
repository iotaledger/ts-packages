// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { RecognizedBadge } from '@iota/apps-ui-icons';
import {
    CoinFiatValue,
    CoinIcon,
    ImageIconSize,
    useFormatCoin,
    useRecognizedPackages,
} from '@iota/core';
import { normalizeStructTag, parseStructTag } from '@iota/iota-sdk/utils';
import clsx from 'clsx';

interface TableCoinDisplayProps {
    amount: string | bigint;
    coinType: string;
    showSign?: boolean;
    showTrustedBadge?: boolean;
}
export function TableCoinDisplay({
    amount,
    coinType,
    showSign = true,
    showTrustedBadge = true,
}: TableCoinDisplayProps) {
    const isPositive = BigInt(amount) > BigInt(0);

    const recognizedPackages = useRecognizedPackages();
    const normalizedCoinType = normalizeStructTag(coinType);
    const { address } = parseStructTag(normalizedCoinType);

    const showTrusted = showTrustedBadge && recognizedPackages.includes(address);

    const [formatted, symbol] = useFormatCoin({
        balance: amount,
        coinType,
        showSign,
    });

    const CHANGE_COLOR_CLASS = isPositive ? 'coin-change-positive' : 'coin-change-negative';

    return (
        <div className="flex flex-row items-center gap-1.5">
            <CoinIcon coinType={coinType} size={ImageIconSize.XSmall} />
            <span className={clsx(showSign ? CHANGE_COLOR_CLASS : 'table-text-color')}>
                {formatted} {symbol}
            </span>
            {showTrusted && <RecognizedBadge className="size-4 text-iota-primary-40" />}

            <CoinFiatValue amount={amount} coinType={coinType} showApproxSymbol />
        </div>
    );
}
