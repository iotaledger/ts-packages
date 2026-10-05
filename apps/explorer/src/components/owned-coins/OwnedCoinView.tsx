// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinItem } from '@iota/core';
import clsx from 'clsx';
import { useState } from 'react';
import { type CoinBalanceVerified, type SortField, type SortOrder } from './OwnedCoins';
import { CoinsPanel } from './OwnedCoinsPanel';
import { ArrowUp, RecognizedBadge } from '@iota/apps-ui-icons';
import { LinkWithQuery } from '~/components/ui';
import { getCoinPagePath } from '~/lib/utils';

type OwnedCoinViewProps = {
    coin: CoinBalanceVerified;
    id: string;
    sortField: SortField;
    sortOrder: SortOrder;
};

export function OwnedCoinView({ coin, id, sortField, sortOrder }: OwnedCoinViewProps): JSX.Element {
    const [areCoinDetailsOpen, setAreCoinDetailsOpen] = useState<boolean>(false);

    return (
        <div data-testid="ownedcoinlabel" className="flex flex-col gap-y-xs py-xxs">
            <div
                onClick={(event) => {
                    if (event.target instanceof Element && event.target.closest('a')) return;
                    setAreCoinDetailsOpen((prev) => !prev);
                }}
                className="flex w-full cursor-pointer flex-row items-center gap-x-md rounded-lg transition-colors hover:bg-iota-neutral-96 dark:hover:bg-iota-neutral-12"
            >
                <CoinItem
                    coinType={coin.coinType}
                    balance={BigInt(coin.totalBalance)}
                    truncate={false}
                    renderTitle={(title) => (
                        <LinkWithQuery
                            to={getCoinPagePath(coin.coinType)}
                            className="text-iota-primary-30 dark:text-iota-primary-80"
                        >
                            {title}
                        </LinkWithQuery>
                    )}
                    icon={
                        coin.isRecognized && (
                            <RecognizedBadge className="h-4 w-4 text-iota-primary-40" />
                        )
                    }
                />

                <button
                    type="button"
                    aria-expanded={areCoinDetailsOpen}
                    className="flex shrink-0 cursor-pointer items-center gap-x-xs text-body-md text-iota-neutral-40 dark:text-iota-neutral-60"
                >
                    <span className="sr-only">
                        {coin.coinObjectCount} Object{coin.coinObjectCount > 1 ? 's' : ''}
                    </span>
                    <span aria-hidden="true" className="shrink-0">
                        {coin.coinObjectCount} Object{coin.coinObjectCount > 1 ? 's' : ''}
                    </span>
                    <ArrowUp
                        aria-hidden="true"
                        className={clsx('h-4 w-4 shrink-0', { 'rotate-180': !areCoinDetailsOpen })}
                    />
                </button>
            </div>
            {areCoinDetailsOpen && (
                <div className="rounded-lg bg-iota-neutral-96 p-xxs sm:p-sm dark:bg-iota-neutral-10">
                    <CoinsPanel
                        id={id}
                        coinType={coin.coinType}
                        sortField={sortField}
                        sortOrder={sortOrder}
                    />
                </div>
            )}
        </div>
    );
}
