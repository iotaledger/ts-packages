// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClientQuery, useIotaClientContext } from '@iota/dapp-kit';
import { DisplayStats, DisplayStatsSize, DisplayStatsType } from '@iota/apps-ui-kit';
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
} from '@iota/core';
import { type Network } from '@iota/iota-sdk/client';
import { useGetNetworkMetrics } from '~/hooks';
import { Link } from '~/components/ui';
import { ArrowTopRight } from '@iota/apps-ui-icons';

interface StatItem {
    label: string;
    value: string;
    supportingLabel?: string;
}

const FALLBACK = '--';

export function NetworkDataGrid(): JSX.Element {
    const { data: networkMetrics } = useGetNetworkMetrics();
    const { data: totalTransactions } = useIotaClientQuery('getTotalTransactionBlocks');
    const { data: circulatingSupply } = useIotaClientQuery('getCirculatingSupply');
    const { network } = useIotaClientContext();
    const isFiatEnabled = useFeatureEnabledByNetwork(Feature.FiatConversion, network as Network);
    const iotaPrice = useBalanceInUSD(IOTA_TYPE_ARG, NANOS_PER_IOTA, network as Network);

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

    const priceDisplay = isFiatEnabled && iotaPrice !== null ? formatBalanceToUSD(iotaPrice) : null;

    const marketCapDisplay = (() => {
        if (!isFiatEnabled || iotaPrice === null || !circulatingSupply?.value) return null;
        const supplyInIota = Number(circulatingSupply.value) / Math.pow(10, IOTA_DECIMALS);
        return formatBalanceToUSD(supplyInIota * iotaPrice);
    })();

    const stats: StatItem[] = [
        { label: 'Total Transactions', value: totalTx },
        { label: 'Total Addresses', value: totalAddresses },
        { label: 'Total Packages', value: totalPackages },
        { label: 'Total Objects', value: totalObjects },
        ...(isFiatEnabled && priceDisplay
            ? [{ label: 'Token Price', value: priceDisplay, supportingLabel: 'per IOTA' }]
            : []),
        ...(isFiatEnabled && marketCapDisplay
            ? [{ label: 'Market Cap', value: marketCapDisplay }]
            : []),
    ];

    return (
        <div className="flex flex-col gap-md">
            <div className="flex items-center justify-between">
                <span className="text-title-md text-iota-neutral-10 dark:text-iota-neutral-92">
                    Network Data
                </span>
                <Link
                    to="/recent"
                    className="flex items-center gap-xxs text-label-md text-iota-primary-30 hover:underline dark:text-iota-primary-80"
                >
                    View full analytics
                    <ArrowTopRight className="h-3.5 w-3.5" />
                </Link>
            </div>
            <div className="grid grid-cols-2 gap-md--rs sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {stats.map(({ label, value, supportingLabel }) => (
                    <DisplayStats
                        key={label}
                        label={label}
                        value={value}
                        supportingLabel={supportingLabel}
                        size={DisplayStatsSize.Default}
                        type={DisplayStatsType.Default}
                    />
                ))}
            </div>
        </div>
    );
}
