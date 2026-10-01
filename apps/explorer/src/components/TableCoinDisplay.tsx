// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { RecognizedBadge } from '@iota/apps-ui-icons';
import {
    CoinFiatValue,
    CoinIcon,
    ImageIconSize,
    isRecognizedCoinType,
    useFormatCoin,
    useRecognizedPackages,
} from '@iota/core';
import clsx from 'clsx';

interface TableCoinDisplayProps {
    amount: string | bigint;
    coinType: string;
    showSign?: boolean;
    showTrustedBadge?: boolean;
    truncateSymbol?: boolean;
}
export function TableCoinDisplay({
    amount,
    coinType,
    showSign = false,
    showTrustedBadge = false,
    truncateSymbol,
}: TableCoinDisplayProps) {
    const isPositive = BigInt(amount) > BigInt(0);

    const recognizedPackages = useRecognizedPackages();
    const showTrusted = showTrustedBadge && isRecognizedCoinType(coinType, recognizedPackages);

    const [formatted, symbol] = useFormatCoin({
        balance: amount,
        coinType,
        showSign,
        truncateSymbol,
    });

    const changeColorClass = isPositive ? 'coin-change-positive' : 'coin-change-negative';

    return (
        <div className="flex flex-row items-center gap-1.5">
            <CoinIcon coinType={coinType} size={ImageIconSize.Small} />
            <span className={clsx(showSign ? changeColorClass : 'table-text-color')}>
                {formatted} {symbol}
            </span>
            {showTrusted && <RecognizedBadge className="size-4 text-iota-primary-40" />}

            <CoinFiatValue amount={amount} coinType={coinType} showApproxSymbol />
        </div>
    );
}
