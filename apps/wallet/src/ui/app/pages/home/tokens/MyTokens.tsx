// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Button, ButtonSize, ButtonType, Dropdown, ListItem, Title } from '@iota/apps-ui-kit';
import { useSortedCoinsByCategories } from '@iota/core';
import { FilterList, Pined, RecognizedBadge } from '@iota/apps-ui-icons';
import { ampli } from '_src/shared/analytics/ampli';
import { Loading } from '_src/ui/app/components';
import { OutsideClickHandler } from '_src/ui/app/components/OutsideClickHandler';
import { usePinnedCoinTypes } from '_hooks';
import { useState, useEffect } from 'react';
import { PinButton } from './PinButton';
import { TokenLink } from './TokenLink';
import { type CoinBalance } from '@iota/iota-sdk/client';

interface MyTokensProps {
    coinBalances: CoinBalance[];
    isLoading: boolean;
    isFetched: boolean;
}

enum TokenCategory {
    All = 'All',
    Recognized = 'Recognized',
    Unrecognized = 'Unrecognized',
    Pinned = 'Pinned',
}

export function MyTokens({ coinBalances, isLoading, isFetched }: MyTokensProps) {
    const [selectedTokenCategory, setSelectedTokenCategory] = useState(TokenCategory.All);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [pinnedCoinTypes, { pinCoinType, unpinCoinType }] = usePinnedCoinTypes();
    const { recognized, pinned, unrecognized } = useSortedCoinsByCategories(
        coinBalances,
        pinnedCoinTypes,
    );

    useEffect(() => {
        if (selectedTokenCategory === TokenCategory.Pinned && pinned.length === 0) {
            setSelectedTokenCategory(TokenCategory.All);
        }
    }, [pinned.length, selectedTokenCategory]);

    const tokenCategories = [
        { label: 'All', value: TokenCategory.All },
        ...(recognized.length > 0
            ? [{ label: 'Recognized', value: TokenCategory.Recognized }]
            : []),
        ...(pinned.length > 0 || unrecognized.length > 0
            ? [{ label: 'Unrecognized', value: TokenCategory.Unrecognized }]
            : []),
        ...(pinned.length > 0 ? [{ label: 'Pinned', value: TokenCategory.Pinned }] : []),
    ];

    // Avoid perpetual loading state when fetching and retry keeps failing; add isFetched check.
    const isFirstTimeLoading = isLoading && !isFetched;

    function handlePin(coinType: string) {
        ampli.pinnedCoin({
            coinType: coinType,
        });
        pinCoinType(coinType);
    }

    function handleUnpin(coinType: string) {
        ampli.unpinnedCoin({
            coinType: coinType,
        });
        unpinCoinType(coinType);
    }

    return (
        <Loading loading={isFirstTimeLoading}>
            <div className="w-full">
                <div className="flex h-[56px] items-center justify-between">
                    <Title title="My coins" />
                    <div className="relative">
                        <OutsideClickHandler onOutsideClick={() => setIsFilterOpen(false)}>
                            <Button
                                type={ButtonType.Ghost}
                                size={ButtonSize.Small}
                                icon={<FilterList className="h-4 w-4" />}
                                onClick={() => setIsFilterOpen((prev) => !prev)}
                            />
                            {isFilterOpen && (
                                <div className="absolute right-0 top-full z-10 mt-xs min-w-[160px]">
                                    <Dropdown>
                                        {tokenCategories.map(({ label, value }, index) => {
                                            const isLast = index === tokenCategories.length - 1;
                                            return (
                                                <ListItem
                                                    key={value}
                                                    onClick={() => {
                                                        setSelectedTokenCategory(value);
                                                        setIsFilterOpen(false);
                                                    }}
                                                    isHighlighted={selectedTokenCategory === value}
                                                    hideBottomBorder={isLast}
                                                >
                                                    <div className="flex items-center gap-x-xs text-body-sm">
                                                        {label}
                                                        {value === TokenCategory.Recognized && (
                                                            <RecognizedBadge className="h-4 w-4 text-iota-primary-40" />
                                                        )}
                                                        {value === TokenCategory.Pinned && (
                                                            <Pined className="h-4 w-4 text-iota-primary-40" />
                                                        )}
                                                    </div>
                                                </ListItem>
                                            );
                                        })}
                                    </Dropdown>
                                </div>
                            )}
                        </OutsideClickHandler>
                    </div>
                </div>
                <div className="pb-md pt-sm">
                    {[TokenCategory.All, TokenCategory.Recognized].includes(
                        selectedTokenCategory,
                    ) &&
                        recognized.map((coinBalance) => (
                            <TokenLink
                                key={coinBalance.coinType}
                                coinBalance={coinBalance}
                                icon={<RecognizedBadge className="h-4 w-4 text-iota-primary-40" />}
                            />
                        ))}
                    {[TokenCategory.All, TokenCategory.Unrecognized, TokenCategory.Pinned].includes(
                        selectedTokenCategory,
                    ) &&
                        pinned.map((coinBalance) => (
                            <TokenLink
                                key={coinBalance.coinType}
                                coinBalance={coinBalance}
                                clickableAction={
                                    <PinButton
                                        isPinned
                                        onClick={() => handleUnpin(coinBalance.coinType)}
                                    />
                                }
                            />
                        ))}

                    {[TokenCategory.All, TokenCategory.Unrecognized].includes(
                        selectedTokenCategory,
                    ) &&
                        unrecognized.map((coinBalance) => (
                            <TokenLink
                                key={coinBalance.coinType}
                                coinBalance={coinBalance}
                                clickableAction={
                                    <PinButton onClick={() => handlePin(coinBalance.coinType)} />
                                }
                            />
                        ))}
                </div>
            </div>
        </Loading>
    );
}
