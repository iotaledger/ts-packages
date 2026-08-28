// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClientQuery, useIotaClientContext } from '@iota/dapp-kit';
import {
    DisplayStats,
    DisplayStatsSize,
    DisplayStatsType,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import {
    CoinFormat,
    formatBalance,
    IOTA_DECIMALS,
    IOTA_TYPE_ARG,
    NANOS_PER_IOTA,
} from '@iota/iota-sdk/utils';
import {
    useBalanceInUSD,
    formatBalanceToUSD,
    Feature,
    useFeatureEnabledByNetwork,
    CoinFiatValue,
} from '@iota/core';
import { type Network } from '@iota/iota-sdk/client';
import { useGetNetworkMetrics } from '~/hooks';
import { Link } from '~/components/ui';
import { ArrowTopRight } from '@iota/apps-ui-icons';

interface StatItem {
    label: string;
    value: React.ReactNode;
    supportingLabel?: string;
    tooltipText?: string;
}

interface NetworkDataGridProps {
    showAnalyticsLink?: boolean;
    showExtendedStats?: boolean;
}

const FALLBACK = '--';

function formatSupply(value: string | undefined): string {
    if (!value) return FALLBACK;
    return formatBalance(value, IOTA_DECIMALS, CoinFormat.Full);
}

function SupplyStatValue({ value }: { value: string | undefined }): React.JSX.Element {
    return (
        <div className="flex flex-col gap-xxs">
            <div className="flex flex-row flex-wrap items-baseline gap-xxs">
                <span>{formatSupply(value)}</span>
                {value && (
                    <span className="whitespace-nowrap break-normal text-label-md opacity-40">
                        IOTA
                    </span>
                )}
            </div>
            {value && <CoinFiatValue amount={value} withParentheses={false} />}
        </div>
    );
}

export function NetworkDataGrid({
    showAnalyticsLink = true,
    showExtendedStats = true,
}: NetworkDataGridProps): JSX.Element {
    const { data: networkMetrics } = useGetNetworkMetrics();
    const { data: systemState } = useIotaClientQuery('getLatestIotaSystemState');
    const { data: totalTransactions } = useIotaClientQuery('getTotalTransactionBlocks');
    const { data: circulatingSupply } = useIotaClientQuery('getCirculatingSupply');
    const { data: totalSupply } = useIotaClientQuery('getTotalSupply', {
        coinType: IOTA_TYPE_ARG,
    });
    const { network } = useIotaClientContext();
    const isFiatEnabled = useFeatureEnabledByNetwork(Feature.FiatConversion, network as Network);
    const iotaPrice = useBalanceInUSD(IOTA_TYPE_ARG, NANOS_PER_IOTA, network as Network);
    const marketCapUSD = useBalanceInUSD(
        IOTA_TYPE_ARG,
        circulatingSupply?.value ?? 0,
        network as Network,
    );

    const totalAddresses = networkMetrics?.totalAddresses
        ? formatBalance(networkMetrics.totalAddresses, 0, CoinFormat.Rounded)
        : FALLBACK;

    const totalPackages = networkMetrics?.totalPackages
        ? formatBalance(networkMetrics.totalPackages, 0, CoinFormat.Rounded)
        : FALLBACK;

    const totalObjects = networkMetrics?.totalObjects
        ? formatBalance(networkMetrics.totalObjects, 0, CoinFormat.Rounded)
        : FALLBACK;

    const totalTx = totalTransactions
        ? formatBalance(totalTransactions, 0, CoinFormat.Rounded)
        : FALLBACK;

    const tpsNow = networkMetrics?.currentTps
        ? formatBalance(Math.floor(networkMetrics.currentTps), 0, CoinFormat.Rounded)
        : FALLBACK;

    const tpsPeak = networkMetrics?.tps30Days
        ? formatBalance(Math.floor(networkMetrics.tps30Days), 0, CoinFormat.Rounded)
        : FALLBACK;

    const activeValidators = systemState?.activeValidators?.length
        ? String(systemState.activeValidators.length)
        : FALLBACK;

    const priceDisplay = isFiatEnabled && iotaPrice !== null ? formatBalanceToUSD(iotaPrice) : null;

    const marketCapDisplay =
        isFiatEnabled && marketCapUSD ? formatBalanceToUSD(marketCapUSD) : null;

    const stats: StatItem[] = [
        {
            label: 'Circulating Supply',
            value: <SupplyStatValue value={circulatingSupply?.value} />,
            tooltipText: 'The amount of IOTA currently in circulation, out of the total supply.',
        },
        {
            label: 'Total Supply',
            value: <SupplyStatValue value={totalSupply?.value} />,
            tooltipText: 'The total amount of IOTA that currently exists.',
        },
        {
            label: 'TPS',
            value: tpsNow,
            tooltipText:
                'The current transaction throughput of the network, in transaction blocks per second.',
        },
        {
            label: 'Peak TPS (30d)',
            value: tpsPeak,
            tooltipText: 'The highest transactions-per-second rate reached in the last 30 days.',
        },
        {
            label: 'Total Transactions',
            value: totalTx,
            tooltipText: 'The total number of transactions processed since the network started.',
        },
        {
            label: 'Total Addresses',
            value: totalAddresses,
            tooltipText: 'The total number of distinct addresses seen on the network.',
        },
        {
            label: 'Total Packages',
            value: totalPackages,
            tooltipText: 'The total number of packages published on the network.',
        },
        {
            label: 'Total Objects',
            value: totalObjects,
            tooltipText: 'The total number of objects that currently exist on the network.',
        },
        ...(showExtendedStats
            ? [
                  {
                      label: 'Active Validators',
                      value: activeValidators,
                      tooltipText: 'The number of validators currently active on the network.',
                  },
              ]
            : []),
        ...(showExtendedStats && isFiatEnabled && priceDisplay
            ? [
                  {
                      label: 'Token Price',
                      value: priceDisplay,
                      supportingLabel: 'per IOTA',
                      tooltipText: 'The current market price of one IOTA token.',
                  },
              ]
            : []),
        ...(showExtendedStats && isFiatEnabled && marketCapDisplay
            ? [
                  {
                      label: 'Market Cap',
                      value: marketCapDisplay,
                      tooltipText:
                          'The total market value of the circulating supply, calculated as circulating supply multiplied by token price.',
                  },
              ]
            : []),
    ];

    return (
        <div className="flex flex-col gap-md">
            <div className="flex items-center justify-between">
                <span className="text-title-md text-iota-neutral-10 dark:text-iota-neutral-92">
                    Network Data
                </span>
                {showAnalyticsLink ? (
                    <Link
                        to="/analytics"
                        className="flex items-center gap-xxs text-label-md text-iota-primary-30 hover:underline dark:text-iota-primary-80"
                    >
                        View full analytics
                        <ArrowTopRight className="h-3.5 w-3.5" />
                    </Link>
                ) : null}
            </div>
            <div className="grid grid-cols-2 gap-md--rs sm:grid-cols-3 md:grid-cols-4">
                {stats.map(({ label, value, supportingLabel, tooltipText }) => (
                    <DisplayStats
                        key={label}
                        label={label}
                        value={value}
                        supportingLabel={supportingLabel}
                        tooltipText={tooltipText}
                        tooltipPosition={TooltipPosition.Top}
                        size={DisplayStatsSize.Default}
                        type={DisplayStatsType.Default}
                    />
                ))}
            </div>
        </div>
    );
}
