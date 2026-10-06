// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import clsx from 'clsx';
import { ButtonUnstyled } from '@iota/apps-ui-kit';
import { TriangleDown } from '@iota/apps-ui-icons';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { useFormatCoin } from '../../hooks';
import { BALANCE_MASK } from '../../contexts/BalanceVisibilityContext';
import { CoinAmountChange } from '../../interfaces';
import { AmountWithFiat, CoinFiatValue } from '../coin';

interface TransactionCoinAmountsProps {
    changes: CoinAmountChange[];
    hideBalance?: boolean;
}

function sortIotaFirst(changes: CoinAmountChange[]): CoinAmountChange[] {
    return [...changes].sort(
        (a, b) => Number(b.coinType === IOTA_TYPE_ARG) - Number(a.coinType === IOTA_TYPE_ARG),
    );
}

export function TransactionCoinAmounts({ changes, hideBalance }: TransactionCoinAmountsProps) {
    const [showAll, setShowAll] = useState(false);

    const [firstTransactionChange, ...additionalTransactionChanges] = sortIotaFirst(changes);

    function handleToggle(event: React.MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        setShowAll(!showAll);
    }

    if (!additionalTransactionChanges.length) {
        return <CoinAmountRow {...firstTransactionChange} hideBalance={hideBalance} />;
    }

    return (
        <div className="flex flex-col items-end gap-y-xs">
            <ButtonUnstyled
                className="flex flex-col items-end"
                aria-expanded={showAll}
                aria-label={
                    showAll ? 'Show less' : `Show ${additionalTransactionChanges.length} more`
                }
                onClick={handleToggle}
            >
                <ExpandableCoinAmount
                    {...firstTransactionChange}
                    hideBalance={hideBalance}
                    isExpanded={showAll}
                    hiddenCount={additionalTransactionChanges.length}
                />
            </ButtonUnstyled>
            {showAll &&
                additionalTransactionChanges.map(({ coinType, amount }) => (
                    <CoinAmountRow
                        key={coinType}
                        coinType={coinType}
                        amount={amount}
                        hideBalance={hideBalance}
                    />
                ))}
        </div>
    );
}

interface CoinAmountRowProps extends CoinAmountChange {
    hideBalance?: boolean;
}

function CoinAmountRow({ coinType, amount, hideBalance }: CoinAmountRowProps) {
    const [formatted, symbol] = useFormatCoin({ balance: amount, coinType });

    if (hideBalance) {
        return <span>{`${BALANCE_MASK} ${symbol}`}</span>;
    }

    return (
        <AmountWithFiat
            amount={amount}
            formatted={formatted}
            symbol={symbol}
            coinType={coinType}
            direction="column"
            align="end"
        />
    );
}

interface ExpandableCoinAmountProps extends CoinAmountRowProps {
    isExpanded: boolean;
    hiddenCount: number;
}

function ExpandableCoinAmount({
    coinType,
    amount,
    hideBalance,
    isExpanded,
    hiddenCount,
}: ExpandableCoinAmountProps) {
    const [formatted, symbol] = useFormatCoin({ balance: amount, coinType });

    return (
        <>
            <span className="inline-flex items-center gap-xxxs whitespace-nowrap">
                {hideBalance ? BALANCE_MASK : formatted} {symbol}
                <TriangleDown
                    className={clsx(
                        'h-4 w-4 text-iota-primary-30 transition-transform ease-linear dark:text-iota-primary-80',
                        isExpanded && 'rotate-180',
                    )}
                />
            </span>
            {!hideBalance && (
                <span className="whitespace-nowrap [&>span]:!text-body-sm">
                    <CoinFiatValue
                        amount={amount}
                        coinType={coinType}
                        withParentheses={false}
                        showApproxSymbol
                    />
                </span>
            )}
            {!isExpanded && (
                <span className="whitespace-nowrap text-body-sm text-iota-primary-30 dark:text-iota-primary-80">
                    +{hiddenCount} more
                </span>
            )}
        </>
    );
}
