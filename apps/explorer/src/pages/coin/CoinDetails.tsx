// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    LoadingIndicator,
    Panel,
    Select,
    SelectSize,
    Title,
} from '@iota/apps-ui-kit';
import { Warning } from '@iota/apps-ui-icons';
import { useCursorPagination } from '@iota/core';
import {
    CoinMeta,
    CoinStats,
    ErrorBoundary,
    PageLayout,
    PlaceholderTable,
    TableCard,
} from '~/components';
import { useGetAllCoins, useGetCoinObjects } from '~/hooks';
import { PAGE_SIZES_RANGE_20_60 } from '~/lib/constants';
import { generateCoinObjectsTableColumns } from '~/lib/ui';
import { toCoinType } from '~/lib/utils';

const COIN_OBJECTS_COLUMN_HEADINGS = ['Object', 'Owner', 'Balance'];

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
                    <CoinObjectsTable
                        coinType={coin.coinType}
                        decimals={coin.decimals}
                        symbol={coin.symbol}
                    />
                </div>
            }
        />
    );
}

interface CoinObjectsTableProps {
    coinType: string;
    decimals: number;
    symbol: string;
}

function CoinObjectsTable({ coinType, decimals, symbol }: CoinObjectsTableProps): JSX.Element {
    const [limit, setLimit] = useState(PAGE_SIZES_RANGE_20_60[0]);
    const { data, pagination, isError, isPending, isFetching } = useCursorPagination(
        useGetCoinObjects(coinType, limit),
    );
    const columns = useMemo(
        () => generateCoinObjectsTableColumns({ coinType, decimals, symbol }),
        [coinType, decimals, symbol],
    );

    return (
        <Panel>
            <Title
                title="Balances"
                tooltipText="Each row is one balance of this coin and the address that holds it. An address can appear more than once. Coins locked in apps, like liquidity pools, aren't shown."
            />
            <div className="p-md">
                {isError ? (
                    <InfoBox
                        title="Failed to load balances"
                        supportingText="Try again later."
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                ) : (
                    <ErrorBoundary>
                        {isPending || isFetching || !data ? (
                            <PlaceholderTable
                                rowCount={limit}
                                rowHeight="16px"
                                colHeadings={COIN_OBJECTS_COLUMN_HEADINGS}
                            />
                        ) : (
                            <TableCard
                                data={data.coinObjects}
                                columns={columns}
                                areHeadersCentered={false}
                                paginationOptions={pagination}
                                pageSizeSelector={
                                    <Select
                                        value={limit.toString()}
                                        options={PAGE_SIZES_RANGE_20_60.map((size) => ({
                                            label: `${size} / page`,
                                            id: size.toString(),
                                        }))}
                                        size={SelectSize.Small}
                                        onValueChange={(value) => {
                                            setLimit(Number(value));
                                            pagination.onFirst();
                                        }}
                                    />
                                }
                            />
                        )}
                    </ErrorBoundary>
                )}
            </div>
        </Panel>
    );
}

export { CoinDetails };
