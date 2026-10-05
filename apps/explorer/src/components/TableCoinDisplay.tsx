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
import { CoinFormat } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import { LinkWithQuery } from './ui';

interface TableCoinDisplayProps {
    amount: string | bigint;
    coinType: string;
    showSign?: boolean;
    showTrustedBadge?: boolean;
    truncate?: boolean;
}
export function TableCoinDisplay({
    amount,
    coinType,
    showSign = false,
    showTrustedBadge = false,
    truncate,
}: TableCoinDisplayProps) {
    const isPositive = BigInt(amount) > BigInt(0);

    const recognizedPackages = useRecognizedPackages();
    const showTrusted = showTrustedBadge && isRecognizedCoinType(coinType, recognizedPackages);

    const [formatted, symbol] = useFormatCoin({
        balance: amount,
        coinType,
        showSign,
        format: CoinFormat.Full,
        truncate,
    });

    const changeColorClass = isPositive ? 'coin-change-positive' : 'coin-change-negative';
    const coinPagePath = `/coin/${encodeURI(coinType)}`;

    return (
        <div className="flex flex-row items-center gap-1.5">
            <LinkWithQuery to={coinPagePath} tabIndex={-1} aria-hidden="true">
                <CoinIcon coinType={coinType} size={ImageIconSize.Small} />
            </LinkWithQuery>
            <span className={clsx(showSign ? changeColorClass : 'table-text-color')}>
                {formatted}{' '}
                <LinkWithQuery
                    to={coinPagePath}
                    className="text-iota-primary-30 dark:text-iota-primary-80"
                >
                    {symbol}
                </LinkWithQuery>
            </span>
            {showTrusted && <RecognizedBadge className="size-4 text-iota-primary-40" />}

            <CoinFiatValue amount={amount} coinType={coinType} showApproxSymbol />
        </div>
    );
}
