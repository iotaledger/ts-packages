// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    CoinFiatValue,
    CoinIcon,
    COIN_TYPE_TO_FIAT_TOKEN_NAME,
    ImageIconSize,
    useFormatCoin,
    useTokenPrice,
} from '@iota/core';
import { useIotaClientContext } from '@iota/dapp-kit';
import { type Network } from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import { useState } from 'react';
import { type CoinBalanceVerified, type SortField, type SortOrder } from './OwnedCoins';
import { CoinsPanel } from './OwnedCoinsPanel';
import { COIN_TABLE_COLUMN_ALIGNMENT, getCoinRowGridClasses } from './coinTableLayout';
import { Divider } from '@iota/apps-ui-kit';
import { ArrowUp, RecognizedBadge } from '@iota/apps-ui-icons';

type OwnedCoinViewProps = {
    coin: CoinBalanceVerified;
    id: string;
    sortField: SortField;
    sortOrder: SortOrder;
    showPrice: boolean;
};

function formatTokenPriceLabel(price: string | null | undefined): string {
    const numericPrice = price ? Number(price) : null;

    if (numericPrice === null || Number.isNaN(numericPrice)) {
        return '--';
    }

    return numericPrice.toLocaleString('en', {
        style: 'currency',
        currency: 'USD',
        // Use significant digits (rather than a fixed number of decimals) so that
        // sub-cent prices like $0.0374 don't get rounded down to $0.04.
        maximumSignificantDigits: 4,
        minimumSignificantDigits: 1,
    });
}

export function OwnedCoinView({
    coin,
    id,
    sortField,
    sortOrder,
    showPrice,
}: OwnedCoinViewProps): JSX.Element {
    const isIotaCoin = coin.coinType === IOTA_TYPE_ARG;
    const [areCoinDetailsOpen, setAreCoinDetailsOpen] = useState<boolean>(isIotaCoin);
    const [formattedTotalBalance, symbol] = useFormatCoin({
        balance: coin.totalBalance,
        coinType: coin.coinType,
    });

    const { network } = useIotaClientContext();
    const tokenName = COIN_TYPE_TO_FIAT_TOKEN_NAME[coin.coinType] ?? null;
    const { data: tokenPrice } = useTokenPrice(tokenName, network as Network);
    const priceLabel = formatTokenPriceLabel(tokenPrice?.price);

    return (
        <div
            data-testid="ownedcoinlabel"
            className={clsx(
                'rounded-xl border',
                areCoinDetailsOpen ? 'border-shader-neutral-light-8' : 'border-transparent',
            )}
        >
            <button
                type="button"
                aria-expanded={areCoinDetailsOpen}
                onClick={() => setAreCoinDetailsOpen((prev) => !prev)}
                className={clsx(getCoinRowGridClasses(showPrice), 'w-full p-md--rs text-left')}
            >
                <div className="flex min-w-0 items-start gap-x-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-shader-neutral-light-8 text-iota-neutral-10">
                        <CoinIcon
                            coinType={coin.coinType}
                            size={
                                coin.coinType === IOTA_TYPE_ARG
                                    ? ImageIconSize.Full
                                    : ImageIconSize.Small
                            }
                        />
                    </div>
                    <div className="flex min-w-0 items-center gap-x-xs">
                        <span className="truncate text-label-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                            {symbol}
                        </span>
                        {coin.isRecognized && (
                            <RecognizedBadge className="h-4 w-4 shrink-0 text-iota-primary-40" />
                        )}
                    </div>
                </div>
                {showPrice && (
                    <span
                        className={clsx(
                            'hidden text-body-md text-iota-neutral-40 sm:block dark:text-iota-neutral-60',
                            COIN_TABLE_COLUMN_ALIGNMENT.price,
                        )}
                    >
                        {priceLabel}
                    </span>
                )}
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-label-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                        {formattedTotalBalance} {symbol}
                    </span>
                    <CoinFiatValue
                        amount={coin.totalBalance}
                        coinType={coin.coinType}
                        withParentheses={false}
                        className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60"
                    />
                </div>
                <div
                    className={clsx(
                        'flex items-center gap-x-xs text-body-md text-iota-neutral-40 dark:text-iota-neutral-60',
                        COIN_TABLE_COLUMN_ALIGNMENT.objects,
                    )}
                >
                    <span className="sr-only">
                        {coin.coinObjectCount} Object{coin.coinObjectCount > 1 ? 's' : ''}
                    </span>
                    <span aria-hidden="true">{coin.coinObjectCount}</span>
                    <ArrowUp
                        aria-hidden="true"
                        className={clsx('h-4 w-4', { 'rotate-180': !areCoinDetailsOpen })}
                    />
                </div>
            </button>
            {areCoinDetailsOpen && (
                <>
                    <div className="flex justify-center">
                        <div className="w-9/12">
                            <Divider />
                        </div>
                    </div>
                    <div className="flex flex-col gap-xs px-md--rs pb-md--rs pt-sm--rs">
                        <CoinsPanel
                            id={id}
                            coinType={coin.coinType}
                            sortField={sortField}
                            sortOrder={sortOrder}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
