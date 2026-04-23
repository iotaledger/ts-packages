// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClientQuery } from '@iota/dapp-kit';
import { DisplayStats, DisplayStatsSize, DisplayStatsType, Panel } from '@iota/apps-ui-kit';
import { formatBalance, CoinFormat, IOTA_DECIMALS, IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { SupplyHistoryChart } from './SupplyHistoryChart';

const FALLBACK = '--';

function formatSupply(value: string | undefined): string {
    if (!value) return FALLBACK;
    return formatBalance(value, IOTA_DECIMALS, CoinFormat.Rounded);
}

export function SupplySnapshot(): JSX.Element {
    const { data: totalSupply } = useIotaClientQuery('getTotalSupply', {
        coinType: IOTA_TYPE_ARG,
    });
    const { data: circulatingSupply } = useIotaClientQuery('getCirculatingSupply');

    return (
        <div className="grid grid-cols-2 gap-md--rs md:grid-cols-3">
            <DisplayStats
                label="Circulating Supply"
                value={formatSupply(circulatingSupply?.value)}
                supportingLabel={circulatingSupply?.value ? 'IOTA' : undefined}
                size={DisplayStatsSize.Default}
                type={DisplayStatsType.Default}
            />
            <DisplayStats
                label="Total Supply"
                value={formatSupply(totalSupply?.value)}
                supportingLabel={totalSupply?.value ? 'IOTA' : undefined}
                size={DisplayStatsSize.Default}
                type={DisplayStatsType.Default}
            />
            <Panel bgColor="display-stats-bg-default rounded-2xl">
                <div className="flex h-full flex-row gap-md px-md--rs">
                    <div className="display-stats-text-default flex py-md--rs">
                        <span className="whitespace-pre-line text-label-sm">Historical Supply</span>
                    </div>
                    <div className="relative h-full flex-1">
                        <SupplyHistoryChart />
                    </div>
                </div>
            </Panel>
        </div>
    );
}
