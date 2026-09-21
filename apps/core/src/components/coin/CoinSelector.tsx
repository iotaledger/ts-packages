// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { Select, SelectOption } from '@iota/apps-ui-kit';
import { CoinBalance, type Network } from '@iota/iota-sdk/client';
import { useIotaClientContext } from '@iota/dapp-kit';
import { useBalanceInUSD, useFormatCoin } from '../../hooks';
import { formatBalanceToUSD } from '../../utils';
import { CoinIcon } from './CoinIcon';
import { ImageIconSize } from '../icon';

interface CoinSelectorBaseProps {
    hasCoinWrapper?: boolean;
}

interface CoinSelectorProps extends CoinSelectorBaseProps {
    activeCoinType: string;
    coins: CoinBalance[];
    onClick: (coinType: string) => void;
}

export function CoinSelector({
    activeCoinType = IOTA_TYPE_ARG,
    coins,
    onClick,
    hasCoinWrapper,
}: CoinSelectorProps) {
    const activeCoin = coins?.find(({ coinType }) => coinType === activeCoinType) ?? coins?.[0];
    const initialValue = activeCoin?.coinType;
    const coinsOptions: SelectOption[] =
        coins?.map((coin) => ({
            id: coin.coinType,
            renderLabel: () => <CoinSelectOption hasCoinWrapper={hasCoinWrapper} coin={coin} />,
        })) || [];

    return (
        <Select
            label="Select Coins"
            value={initialValue}
            options={coinsOptions}
            onValueChange={(coinType) => {
                onClick(coinType);
            }}
        />
    );
}

interface CoinSelectOptionProps extends CoinSelectorBaseProps {
    coin: CoinBalance;
}

function CoinSelectOption({
    coin: { coinType, totalBalance },
    hasCoinWrapper,
}: CoinSelectOptionProps) {
    const [formatted, symbol, { data: coinMeta }] = useFormatCoin({
        balance: totalBalance,
        coinType,
    });
    const isIota = coinType === IOTA_TYPE_ARG;

    const { network } = useIotaClientContext();
    const usd = useBalanceInUSD(coinType, totalBalance, network as Network);
    const hasFiatValue = usd !== null && usd !== undefined && Math.abs(usd) >= 0.005;

    return (
        <div className="flex w-full flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-x-md">
                <div className="flex h-6 w-6 items-center justify-center">
                    <CoinIcon
                        size={ImageIconSize.Small}
                        coinType={coinType}
                        rounded
                        hasCoinWrapper={hasCoinWrapper}
                    />
                </div>
                <span className="text-body-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                    {isIota ? (coinMeta?.name || '').toUpperCase() : coinMeta?.name || symbol}
                </span>
            </div>
            <div className="flex flex-row items-baseline gap-1">
                <span className="text-label-lg text-iota-neutral-60">
                    {formatted} {symbol}
                </span>
                {hasFiatValue && (
                    <span className="key-supporting-text-color text-body-sm">
                        ~ {formatBalanceToUSD(usd as number)}
                    </span>
                )}
            </div>
        </div>
    );
}
