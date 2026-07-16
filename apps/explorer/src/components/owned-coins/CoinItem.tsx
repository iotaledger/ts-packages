// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useFormatCoin } from '@iota/core';
import { type CoinStruct } from '@iota/iota-sdk/client';
import { CoinFormat, formatAddress, formatDigest } from '@iota/iota-sdk/utils';
import { ObjectLink, TransactionLink } from '../ui';

interface CoinItemProps {
    coin: CoinStruct;
}

export function CoinItem({ coin }: CoinItemProps): JSX.Element {
    const [formattedBalance, symbol] = useFormatCoin({
        balance: coin.balance,
        coinType: coin.coinType,
        format: CoinFormat.Full,
    });

    const objectLink = (
        <ObjectLink
            objectId={coin.coinObjectId}
            label={formatAddress(coin.coinObjectId)}
            copyText={coin.coinObjectId}
        />
    );
    const transactionLink = (
        <TransactionLink
            digest={coin.previousTransaction}
            label={formatDigest(coin.previousTransaction)}
            copyText={coin.previousTransaction}
        />
    );
    const amount = (
        <div className="flex min-w-0 flex-row items-baseline gap-x-xxs">
            <span className="truncate text-body-md text-iota-neutral-10 dark:text-iota-neutral-92">
                {formattedBalance}
            </span>
            <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                {symbol}
            </span>
        </div>
    );

    return (
        <div>
            <div className="flex flex-col gap-xxs rounded-lg bg-iota-neutral-96 p-sm sm:hidden dark:bg-iota-neutral-10">
                <div className="flex flex-row items-center justify-between gap-x-sm">
                    {objectLink}
                    {amount}
                </div>
                <div className="flex flex-row items-center justify-between gap-x-sm">
                    <span className="min-w-0 truncate text-body-sm tabular-nums text-iota-neutral-40 dark:text-iota-neutral-60">
                        Version {coin.version}
                    </span>
                    <div className="flex shrink-0 flex-row items-baseline gap-x-xxs">
                        <span className="whitespace-nowrap text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                            Last Tx
                        </span>
                        {transactionLink}
                    </div>
                </div>
            </div>
            <div className="hidden items-center gap-x-sm sm:grid sm:grid-cols-4">
                {objectLink}
                {amount}
                <span className="text-body-md tabular-nums text-iota-neutral-40 dark:text-iota-neutral-60">
                    {coin.version}
                </span>
                {transactionLink}
            </div>
        </div>
    );
}
