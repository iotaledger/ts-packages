// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { TooltipPosition, DisplayStats } from '@iota/apps-ui-kit';
import { CoinFiatValue, formatFiat, useCoinFiatValue } from '@iota/core';
import { useIotaClientContext } from '@iota/dapp-kit';
import type { Network } from '@iota/iota-sdk/client';
import clsx from 'clsx';
import { CoinFormat, formatBalance, parseStructTag } from '@iota/iota-sdk/utils';
import { DateDisplay } from '../DateDisplay';
import { AddressLink, ObjectLink, TransactionLink } from '../ui';

interface CoinStatsProps {
    createdAt: number | null;
    coinType: string;
    creator: string | null;
    publishDigest: string | null;
    decimals: number;
    supply: string | null | undefined;
    symbol: string;
}

// `formatFiat` rounds to cents, which hides the price of coins worth less than $1.
function formatUnitPrice(value: number): string {
    return value < 1
        ? value.toLocaleString('en', {
              style: 'currency',
              currency: 'USD',
              maximumSignificantDigits: 4,
          })
        : formatFiat(value);
}

export function CoinStats({
    createdAt,
    coinType,
    creator,
    publishDigest,
    decimals,
    supply,
    symbol,
}: CoinStatsProps): JSX.Element {
    const truncatedCoinType = `${coinType.slice(0, 8)}…${coinType.slice(-20)}`;
    const { address, module } = parseStructTag(coinType);
    const { network } = useIotaClientContext();
    const unitPrice = useCoinFiatValue(coinType, 10n ** BigInt(decimals), network as Network);
    return (
        <div className="flex flex-col gap-md--rs">
            <div className="grid grid-cols-1 gap-md--rs md:grid-cols-3">
                <DisplayStats
                    label="Coin Type"
                    tooltipText={`${coinType}`}
                    tooltipPosition={TooltipPosition.Top}
                    value={
                        <ObjectLink
                            objectId={address}
                            queryStrings={{ module }}
                            label={truncatedCoinType}
                            showAddressAlias={false}
                            copyText={coinType}
                        />
                    }
                />

                <DisplayStats
                    label="Creator"
                    tooltipText="The address of the creator of this coin."
                    tooltipPosition={TooltipPosition.Top}
                    value={creator ? <AddressLink address={creator} copyText={creator} /> : '--'}
                />
                <DisplayStats
                    label="Published In"
                    tooltipText="The transaction that created this coin."
                    tooltipPosition={TooltipPosition.Top}
                    value={
                        publishDigest ? (
                            <TransactionLink digest={publishDigest} copyText={publishDigest} />
                        ) : (
                            '--'
                        )
                    }
                />
            </div>
            <div
                className={clsx(
                    'grid grid-cols-1 gap-md--rs',
                    unitPrice === null ? 'md:grid-cols-3' : 'md:grid-cols-4',
                )}
            >
                {unitPrice !== null && (
                    <DisplayStats
                        label="Price"
                        tooltipText={`The price of 1 ${symbol}.`}
                        tooltipPosition={TooltipPosition.Top}
                        value={formatUnitPrice(unitPrice)}
                    />
                )}
                <DisplayStats
                    label="Supply"
                    tooltipText={
                        supply
                            ? `Total amount of this coin in existence. Raw on-chain value: ${supply}`
                            : 'Total amount of this coin in existence. It cannot be read from the chain.'
                    }
                    tooltipPosition={TooltipPosition.Top}
                    value={
                        supply ? (
                            <div className="flex flex-col gap-xxs">
                                <div className="flex flex-row flex-wrap items-baseline gap-xxs">
                                    <span className="break-all">
                                        {formatBalance(supply, decimals, CoinFormat.Full)}
                                    </span>
                                    <span className="whitespace-nowrap break-normal text-label-md opacity-40">
                                        {symbol}
                                    </span>
                                </div>
                                <CoinFiatValue
                                    amount={supply}
                                    coinType={coinType}
                                    withParentheses={false}
                                />
                            </div>
                        ) : (
                            '--'
                        )
                    }
                />
                <DisplayStats
                    label="Created At"
                    tooltipText="The timestamp when the coin was created."
                    tooltipPosition={TooltipPosition.Top}
                    value={createdAt ? <DateDisplay timestamp={createdAt} type="package" /> : '--'}
                />
                <DisplayStats
                    label="Decimals"
                    tooltipText="The number of decimal places for the coin."
                    tooltipPosition={TooltipPosition.Top}
                    value={decimals}
                />
            </div>
        </div>
    );
}
