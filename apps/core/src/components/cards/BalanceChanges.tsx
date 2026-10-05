// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { Badge, BadgeType, Divider, Header, KeyValueInfo, Panel } from '@iota/apps-ui-kit';
import type { RenderExplorerLink } from '../../types';
import { ExplorerLinkType } from '../../enums';
import { formatAddress, CoinFormat } from '@iota/iota-sdk/utils';
import { CoinItem } from '../coin';
import { RecognizedBadge } from '@iota/apps-ui-icons';
import { formatIotaName, getCoinRegistryEntry } from '../../utils';
import { CoinAmountChange, CoinOwnerChanges } from '../../interfaces';
import { useCoinRegistry, useGetDefaultIotaName } from '../../hooks';
import { NamedAddressTooltip } from '../NamedAddressTooltip';
import { NameAvatar, NameAvatarSize } from '../icon';

interface BalanceChangesProps {
    renderExplorerLink: RenderExplorerLink;
    changes?: CoinOwnerChanges[];
    chain?: string;
}

export function BalanceChanges({
    changes,
    renderExplorerLink: ExplorerLink,
    chain,
}: BalanceChangesProps) {
    if (!changes) return null;

    return (
        <>
            {changes.map(({ owner, changes }) => (
                <BalanceChangePanel
                    key={owner}
                    owner={owner}
                    changes={changes}
                    renderExplorerLink={ExplorerLink}
                    chain={chain}
                />
            ))}
        </>
    );
}

interface BalanceChangePanelProps {
    renderExplorerLink: RenderExplorerLink;
    owner: string;
    changes: CoinAmountChange[];
    chain?: string;
}
function BalanceChangePanel({
    owner,
    changes,
    renderExplorerLink: ExplorerLink,
    chain,
}: BalanceChangePanelProps) {
    const { data: name } = useGetDefaultIotaName(owner);

    // chain format: [iota:network] -> split by ':' then capitalize first letter
    const networkName = chain ? chain.split(':')[1] : undefined;
    const chainName = networkName
        ? networkName.charAt(0).toUpperCase() + networkName.slice(1)
        : undefined;
    const isMainnet = networkName === 'mainnet';
    const badgeType = isMainnet ? BadgeType.PrimarySolid : BadgeType.Neutral;

    return (
        <Panel hasBorder>
            <div className="flex flex-col gap-y-sm overflow-hidden rounded-xl">
                <div className="flex items-center justify-between">
                    <Header title="Balance Changes" />
                    {chainName && <Badge type={badgeType} label={chainName} />}
                </div>
                <BalanceChangeEntries changes={changes} />
                <div className="flex flex-col gap-y-sm px-md pb-md">
                    <Divider />
                    <KeyValueInfo
                        keyText="Owner"
                        value={
                            <NamedAddressTooltip name={name} address={owner}>
                                <span className="inline-flex items-center gap-xs">
                                    <NameAvatar address={owner} size={NameAvatarSize.Xxs} />
                                    <ExplorerLink
                                        type={ExplorerLinkType.Address}
                                        address={owner}
                                        eventType="address"
                                    >
                                        {formatIotaName(name) || formatAddress(owner)}
                                    </ExplorerLink>
                                </span>
                            </NamedAddressTooltip>
                        }
                        fullwidth
                    />
                </div>
            </div>
        </Panel>
    );
}

interface BalanceChangeEntryProps {
    change: CoinAmountChange;
    isTrusted: boolean;
}

function BalanceChangeEntry({ change, isTrusted }: BalanceChangeEntryProps) {
    const { amount, coinType } = change;
    return (
        <CoinItem
            coinType={coinType}
            balance={amount}
            icon={
                isTrusted ? <RecognizedBadge className="h-4 w-4 text-iota-primary-40" /> : undefined
            }
            format={CoinFormat.Full}
            hideMask
        />
    );
}

function BalanceChangeEntries({ changes }: { changes: CoinAmountChange[] }) {
    const coinRegistry = useCoinRegistry();

    const sortedChanges = useMemo(
        () =>
            changes
                .map((change) => ({
                    change,
                    isTrusted: !!getCoinRegistryEntry(coinRegistry, change.coinType)?.trust,
                }))
                .sort((a, b) => Number(b.isTrusted) - Number(a.isTrusted)),
        [changes, coinRegistry],
    );

    return (
        <>
            {sortedChanges.map(({ change, isTrusted }) => (
                <BalanceChangeEntry key={change.coinType} change={change} isTrusted={isTrusted} />
            ))}
        </>
    );
}
