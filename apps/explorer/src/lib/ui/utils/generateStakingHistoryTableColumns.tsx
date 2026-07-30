// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    CoinFiatValue,
    ImageIcon,
    ImageIconSize,
    STAKING_REQUEST_EVENT,
    TransactionAction,
    TransactionIcon,
    TransactionIconSize,
    useAddressAliasLookup,
} from '@iota/core';
import type { IotaEvent } from '@iota/iota-sdk/client';
import { CoinFormat, formatBalance, IOTA_DECIMALS } from '@iota/iota-sdk/utils';
import { TableCellBase, TableCellText, Tooltip } from '@iota/apps-ui-kit';
import type { ColumnDef } from '@tanstack/react-table';
import type { StakeEventJson, UnstakeEventJson } from '@iota/core';
import { DateDisplay } from '~/components';
import { AddressLink, EpochLink, TransactionLink } from '~/components/ui';

function StakerAddressLink({ address }: { address: string }) {
    const getAddressAlias = useAddressAliasLookup();
    const addressAlias = getAddressAlias(address);

    if (!addressAlias) {
        return <AddressLink address={address} copyText={address} className="text-body-sm" />;
    }

    return (
        <Tooltip text={address}>
            <AddressLink
                address={address}
                copyText={address}
                showAddressAlias={false}
                className="text-body-sm"
                label={
                    <span className="flex items-center gap-xxs">
                        <div className="h-3.5 w-3.5 shrink-0">
                            <ImageIcon
                                src={addressAlias.imageUrl}
                                label={addressAlias.alias}
                                fallback={addressAlias.alias}
                                size={ImageIconSize.Full}
                                rounded
                            />
                        </div>
                        {addressAlias.alias}
                    </span>
                }
            />
        </Tooltip>
    );
}

function formatIota(amount: string | number | undefined): string {
    return formatBalance(amount ?? 0, IOTA_DECIMALS, CoinFormat.Full);
}

function AmountCell({
    amount,
    negative,
}: {
    amount: string | number | undefined;
    negative?: boolean;
}) {
    const formatted = formatIota(amount);
    return (
        <div className="flex flex-col gap-0.5">
            <TableCellText supportingLabel="IOTA">
                {negative ? `-${formatted}` : formatted}
            </TableCellText>
            <CoinFiatValue amount={amount ?? 0} withParentheses={false} />
        </div>
    );
}

/**
 * Generate table columns renderers for a validator's staking history (stake/withdraw events).
 */
export function generateStakingHistoryTableColumns(): ColumnDef<IotaEvent>[] {
    return [
        {
            header: 'Address',
            id: 'address',
            cell: ({ row: { original: event } }) => {
                const isStake = event.type === STAKING_REQUEST_EVENT;
                const parsedJson = event.parsedJson as StakeEventJson | UnstakeEventJson;
                const address = parsedJson?.staker_address;
                return (
                    <TableCellBase>
                        <div className="flex items-center gap-xs">
                            <div className="scale-75">
                                <TransactionIcon
                                    variant={
                                        isStake
                                            ? TransactionAction.Staked
                                            : TransactionAction.Unstaked
                                    }
                                    size={TransactionIconSize.Small}
                                />
                            </div>
                            <div className="flex flex-col gap-xxxs">
                                <span className="text-label-lg text-iota-neutral-40 dark:text-iota-neutral-60">
                                    {isStake ? 'Stake' : 'Withdraw'}
                                </span>
                                {address ? (
                                    <StakerAddressLink address={address} />
                                ) : (
                                    <TableCellText>--</TableCellText>
                                )}
                            </div>
                        </div>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Amount',
            id: 'amount',
            cell: ({ row: { original: event } }) => {
                const isStake = event.type === STAKING_REQUEST_EVENT;
                const parsedJson = event.parsedJson as StakeEventJson | UnstakeEventJson;
                const amount = isStake
                    ? (parsedJson as StakeEventJson).amount
                    : (parsedJson as UnstakeEventJson).principal_amount;
                return (
                    <TableCellBase>
                        <AmountCell amount={amount} negative={!isStake} />
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Reward',
            id: 'reward',
            cell: ({ row: { original: event } }) => {
                const isStake = event.type === STAKING_REQUEST_EVENT;
                const parsedJson = event.parsedJson as UnstakeEventJson;
                const reward = isStake ? '0' : parsedJson.reward_amount;
                return (
                    <TableCellBase>
                        <AmountCell amount={reward} />
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Active Epoch',
            id: 'activeEpoch',
            cell: ({ row: { original: event } }) => {
                const isStake = event.type === STAKING_REQUEST_EVENT;
                const parsedJson = event.parsedJson as StakeEventJson | UnstakeEventJson;
                const epoch = isStake
                    ? String(Number((parsedJson as StakeEventJson).epoch) + 1)
                    : (parsedJson as UnstakeEventJson).stake_activation_epoch;
                return (
                    <TableCellBase>
                        <TableCellText>
                            {epoch !== undefined ? (
                                <EpochLink epoch={epoch}>{epoch}</EpochLink>
                            ) : (
                                '--'
                            )}
                        </TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Digest',
            id: 'digest',
            cell: ({ row: { original: event } }) => {
                const digest = event.id.txDigest;
                return (
                    <TableCellBase>
                        <TransactionLink digest={digest} copyText={digest} />
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Age',
            id: 'age',
            cell: ({ row: { original: event } }) => (
                <TableCellBase>
                    <TableCellText>
                        {event.timestampMs ? (
                            <DateDisplay timestamp={Number(event.timestampMs)} type="table" />
                        ) : (
                            '--'
                        )}
                    </TableCellText>
                </TableCellBase>
            ),
        },
    ];
}
