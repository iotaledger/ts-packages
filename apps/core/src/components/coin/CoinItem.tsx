// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Card,
    CardAction,
    CardActionType,
    CardBody,
    CardImage,
    CardType,
    ImageType,
} from '@iota/apps-ui-kit';
import { CoinIcon, ImageIconSize } from '../';
import { CoinFormat, IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { type ReactNode } from 'react';
import { useFormatCoin } from '../../hooks';
import { BALANCE_MASK, useBalanceVisible } from '../../contexts/BalanceVisibilityContext';
import { CoinFiatValue } from './CoinFiatValue';

interface CoinItemProps {
    coinType: string;
    balance: bigint;
    onClick?: () => void;
    icon?: ReactNode;
    clickableAction?: ReactNode;
    format?: CoinFormat;
    hideMask?: boolean;
    truncate?: boolean;
    renderTitle?: (title: string) => ReactNode;
}

export function CoinItem({
    coinType,
    balance,
    onClick,
    icon,
    clickableAction,
    format,
    hideMask,
    truncate = true,
    renderTitle,
}: CoinItemProps): React.JSX.Element {
    const [formatted, symbol, { data: coinMeta }] = useFormatCoin({
        balance,
        coinType,
        format,
        truncate,
    });
    const isBalanceVisible = useBalanceVisible() || hideMask;
    const isIota = coinType === IOTA_TYPE_ARG;
    const title = isIota ? (coinMeta?.name || '').toUpperCase() : coinMeta?.name || symbol;

    return (
        <Card type={CardType.Default} onClick={onClick}>
            <CardImage type={ImageType.BgTransparent}>
                <CoinIcon coinType={coinType} size={ImageIconSize.Large} hasBorder />
            </CardImage>
            <CardBody
                title={renderTitle ? renderTitle(title) : title}
                subtitle={symbol}
                clickableAction={clickableAction}
                icon={icon}
                isTextTruncated={!truncate}
            />
            <CardAction
                type={CardActionType.SupportingText}
                title={`${isBalanceVisible ? formatted : BALANCE_MASK} ${symbol}`}
                subtitle={
                    isBalanceVisible ? (
                        <CoinFiatValue
                            amount={balance}
                            coinType={coinType}
                            withParentheses={false}
                            showApproxSymbol
                        />
                    ) : undefined
                }
            />
        </Card>
    );
}
