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
import { formatBalanceToUSD } from '../../utils';

interface CoinItemProps {
    coinType: string;
    balance: bigint;
    onClick?: () => void;
    icon?: ReactNode;
    clickableAction?: ReactNode;
    usd?: number;
    pricePerCoin?: number;
    format?: CoinFormat;
    hideMask?: boolean;
}

export function CoinItem({
    coinType,
    balance,
    onClick,
    icon,
    clickableAction,
    usd,
    pricePerCoin,
    format,
    hideMask,
}: CoinItemProps): React.JSX.Element {
    const [formatted, symbol, { data: coinMeta }] = useFormatCoin({ balance, coinType, format });
    const isBalanceVisible = useBalanceVisible() || hideMask;
    const isIota = coinType === IOTA_TYPE_ARG;

    const coinName = isIota ? (coinMeta?.name || '').toUpperCase() : coinMeta?.name || symbol;
    const coinPriceDisplayOrSymbol =
        pricePerCoin !== undefined ? formatBalanceToUSD(pricePerCoin) : symbol;
    const usdBalance =
        usd !== undefined
            ? isBalanceVisible
                ? `~${formatBalanceToUSD(usd)} USD`
                : `${BALANCE_MASK} USD`
            : undefined;

    return (
        <Card type={CardType.Default} onClick={onClick}>
            <CardImage type={ImageType.BgTransparent}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-shader-neutral-light-8 text-iota-neutral-10 dark:text-iota-neutral-92">
                    <CoinIcon coinType={coinType} rounded size={ImageIconSize.Small} />
                </div>
            </CardImage>
            <CardBody
                title={coinName}
                subtitle={coinPriceDisplayOrSymbol}
                clickableAction={clickableAction}
                icon={icon}
            />
            <CardAction
                type={CardActionType.SupportingText}
                title={`${isBalanceVisible ? formatted : BALANCE_MASK} ${symbol}`}
                subtitle={isBalanceVisible ? usdBalance : undefined}
            />
        </Card>
    );
}
