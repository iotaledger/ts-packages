// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    CoinFiatValue,
    STAKING_REQUEST_EVENT,
    TransactionAction,
    TransactionIcon,
    TransactionIconSize,
} from '@iota/core';
import type { IotaEvent } from '@iota/iota-sdk/client';
import { CoinFormat, formatBalance, formatDigest, IOTA_DECIMALS } from '@iota/iota-sdk/utils';
import { TableCellBase, TableCellText, ROW_LINK_PROPS } from '@iota/apps-ui-kit';
import type { ColumnDef } from '@tanstack/react-table';
import type { StakeEventJson, UnstakeEventJson } from '@iota/core';
import { DateDisplay } from '~/components';
import { AddressLink, EpochLink, TransactionLink } from '~/components/ui';

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
            header: 'Type',
            id: 'type',
            cell: ({ row: { original: event } }) => {
                const isStake = event.type === STAKING_REQUEST_EVENT;
                const digest = event.id.txDigest;
                return (
                    <TableCellBase>
                        <TransactionLink
                            {...ROW_LINK_PROPS}
                            digest={digest}
                            copyText={digest}
                            label={
                                <div className="flex items-center gap-xs">
                                    <TransactionIcon
                                        variant={
                                            isStake
                                                ? TransactionAction.Staked
                                                : TransactionAction.Unstaked
                                        }
                                        size={TransactionIconSize.Small}
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-label-lg text-iota-neutral-40 dark:text-iota-neutral-60">
                                            {isStake ? 'Stake' : 'Withdraw'}
                                        </span>
                                        <span className="text-body-sm text-iota-primary-30 dark:text-iota-primary-80">
                                            {formatDigest(digest)}
                                        </span>
                                    </div>
                                </div>
                            }
                        />
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Address',
            id: 'address',
            cell: ({ row: { original: event } }) => {
                const parsedJson = event.parsedJson as StakeEventJson | UnstakeEventJson;
                const address = parsedJson?.staker_address;
                return (
                    <TableCellBase>
                        {address ? (
                            <AddressLink
                                address={address}
                                copyText={address}
                                className="[&>div]:max-w-[200px] [&>div]:truncate"
                            />
                        ) : (
                            <TableCellText>--</TableCellText>
                        )}
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
