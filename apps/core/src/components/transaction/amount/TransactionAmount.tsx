// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ImageIconSize, CoinIcon } from '../..';
import {
    Card,
    CardAction,
    CardActionType,
    CardBody,
    CardImage,
    CardType,
    ImageType,
} from '@iota/apps-ui-kit';
import { useFormatCoin } from '../../../hooks';
import { CoinFiatValue } from '../../coin';

interface TransactionAmountProps {
    amount: string | number | bigint;
    coinType: string;
    subtitle: string;
    approximation?: boolean;
}

// dont show amount if it is 0
// This happens when a user sends a transaction to self;
export function TransactionAmount({
    amount,
    coinType,
    subtitle,
    approximation,
}: TransactionAmountProps) {
    const [formatAmount, symbol] = useFormatCoin({ balance: Math.abs(Number(amount)), coinType });

    return Number(amount) !== 0 ? (
        <Card type={CardType.Filled}>
            <CardImage type={ImageType.BgSolid}>
                <CoinIcon coinType={coinType} size={ImageIconSize.Large} hasBorder />
            </CardImage>
            <CardBody
                title={`${approximation ? '~' : ''}${formatAmount} ${symbol}`}
                subtitle={subtitle}
            />
            <CardAction
                type={CardActionType.SupportingText}
                title={
                    <CoinFiatValue
                        amount={amount}
                        coinType={coinType}
                        withParentheses={false}
                        showApproxSymbol
                    />
                }
            />
        </Card>
    ) : null;
}
