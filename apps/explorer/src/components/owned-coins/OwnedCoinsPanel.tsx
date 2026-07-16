// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useGetCoins, useOnScreen } from '@iota/core';
import { useEffect, useRef, useMemo } from 'react';
import { CoinItem } from './CoinItem';
import { LoadingIndicator } from '@iota/apps-ui-kit';
import { SortField, SortOrder } from './OwnedCoins';

type CoinsPanelProps = {
    coinType: string;
    id: string;
    sortField: SortField;
    sortOrder: SortOrder;
};

export function CoinsPanel({ coinType, id, sortField, sortOrder }: CoinsPanelProps): JSX.Element {
    const containerRef = useRef(null);
    const { isIntersecting } = useOnScreen(containerRef);
    const { data, isPending, isFetchingNextPage, fetchNextPage, hasNextPage } = useGetCoins(
        coinType,
        id,
    );

    const isSpinnerVisible = (hasNextPage && isFetchingNextPage) || isPending;

    useEffect(() => {
        if (isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const sortedCoins = useMemo(() => {
        if (!data) return [];

        const allCoins = data.pages.flatMap((page) => page.data);

        return allCoins.sort((a, b) => {
            if (sortField === SortField.Balance) {
                const diff = BigInt(a.balance) - BigInt(b.balance);
                const diffComparison = diff === 0n ? 0 : diff > 0n ? 1 : -1;
                return sortOrder === SortOrder.Asc ? diffComparison : -diffComparison;
            } else {
                const comparison = a.coinObjectId.localeCompare(b.coinObjectId);
                return sortOrder === SortOrder.Asc ? comparison : -comparison;
            }
        });
    }, [data, sortField, sortOrder]);

    return (
        <div className="max-h-[230px] overflow-y-auto">
            <div className="hidden items-center gap-x-sm text-body-sm text-iota-neutral-40 sm:grid sm:grid-cols-4 dark:text-iota-neutral-60">
                <span>Object ID</span>
                <span>Amount</span>
                <span>Version</span>
                <span>Last Tx ID</span>
            </div>
            <div className="flex flex-col gap-xs pt-xs firefox:pr-xs">
                {sortedCoins.map((coin) => (
                    <CoinItem key={coin.coinObjectId} coin={coin} />
                ))}
            </div>
            {/* overflow-hidden: the spinner's rotating svg visually overflows its box by a few
                pixels, which would otherwise register as scrollable overflow on the panel and
                flash the scrollbar while loading. h-6 matches the height of a loaded coin row so
                the panel doesn't shrink (and re-flash the page scrollbar) when the data arrives. */}
            <div className="flex justify-center overflow-hidden" ref={containerRef}>
                {isSpinnerVisible && (
                    <div className="flex h-6 items-center">
                        <LoadingIndicator />
                    </div>
                )}
            </div>
        </div>
    );
}
