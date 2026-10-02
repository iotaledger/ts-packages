// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { TooltipPosition, DisplayStats } from '@iota/apps-ui-kit';
import { CoinFiatValue } from '@iota/core';
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
    return (
        <div className="flex flex-col gap-md--rs">
            <div className="grid grid-cols-1 gap-md--rs md:grid-cols-3">
                <DisplayStats
                    label="Coin Type"
                    tooltipText={`${coinType}`}
                    tooltipPosition={TooltipPosition.Top}
                    value={
                        <ObjectLink
                            objectId={`${address}?module=${module}`}
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
                    tooltipText="The transaction that published the package that defines this coin."
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
            <div className="grid grid-cols-1 gap-md--rs md:grid-cols-3">
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
