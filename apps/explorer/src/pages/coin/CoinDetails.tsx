// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useParams } from 'react-router-dom';
import { InfoBox, InfoBoxStyle, InfoBoxType, LoadingIndicator } from '@iota/apps-ui-kit';
import { Warning } from '@iota/apps-ui-icons';
import { CoinMeta, CoinStats, PageLayout } from '~/components';
import { useGetAllCoins } from '~/hooks';
import { toCoinType } from '~/lib/utils';

function CoinDetails(): JSX.Element {
    const { id } = useParams<{ id: string }>();
    const coinType = id ? toCoinType(id) : null;

    if (!coinType) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Invalid coin type"
                        supportingText="A coin type looks like 0x2::iota::IOTA."
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    return <CoinDetailsContent coinType={coinType} />;
}

function CoinDetailsContent({ coinType }: { coinType: string }): JSX.Element {
    const { data, isPending, isError } = useGetAllCoins(1, coinType);
    const coin = data?.pages[0]?.coins[0];

    if (isPending) {
        return <PageLayout content={<LoadingIndicator />} />;
    }

    if (isError || !coin) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title={isError ? 'Failed to load coin' : 'Coin not found'}
                        supportingText={
                            isError
                                ? 'This coin could not be loaded. Try again later.'
                                : `No coin with type ${coinType} exists on this network.`
                        }
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    return (
        <PageLayout
            content={
                <div className="flex flex-col gap-xl">
                    <CoinMeta
                        name={coin.name}
                        description={coin.description}
                        iconUrl={coin.iconUrl}
                        coinType={coin.coinType}
                        symbol={coin.symbol}
                    />
                    <CoinStats
                        createdAt={coin.createdAt}
                        coinType={coin.coinType}
                        creator={coin.creator}
                        publishDigest={coin.publishDigest}
                        decimals={coin.decimals}
                        supply={coin.supply}
                        symbol={coin.symbol}
                    />
                </div>
            }
        />
    );
}

export { CoinDetails };
