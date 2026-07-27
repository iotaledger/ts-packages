// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinFiatValue, ImageIcon, ImageIconSize, STAKING_REQUEST_EVENT } from '@iota/core';
import type { IotaEvent } from '@iota/iota-sdk/client';
import { CoinFormat, formatBalance, IOTA_DECIMALS } from '@iota/iota-sdk/utils';
import { TableCellBase, TableCellText } from '@iota/apps-ui-kit';
import type { ColumnDef } from '@tanstack/react-table';
import type { StakeEventJson, UnstakeEventJson } from '@iota/core';
import { DateDisplay } from '~/components';
import { AddressLink, EpochLink, TransactionLink } from '~/components/ui';

interface GenerateStakingHistoryTableColumnsOptions {
    validatorAddress: string;
    validatorName?: string;
    validatorImageUrl?: string | null;
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
export function generateStakingHistoryTableColumns({
    validatorAddress,
    validatorName,
    validatorImageUrl,
}: GenerateStakingHistoryTableColumnsOptions): ColumnDef<IotaEvent>[] {
    return [
        {
            header: 'Address',
            id: 'address',
            cell: ({ row: { original: event } }) => {
                const parsedJson = event.parsedJson as StakeEventJson | UnstakeEventJson;
                const address = parsedJson?.staker_address;
                if (!address) {
                    return (
                        <TableCellBase>
                            <TableCellText>--</TableCellText>
                        </TableCellBase>
                    );
                }

                const isValidatorSelf = address === validatorAddress;

                return (
                    <TableCellBase>
                        {isValidatorSelf ? (
                            <div className="flex flex-col gap-xxs">
                                <div className="flex items-center gap-xs text-iota-neutral-40 dark:text-iota-neutral-60">
                                    <ImageIcon
                                        src={validatorImageUrl}
                                        label={validatorName ?? address}
                                        fallback={validatorName ?? address}
                                        size={ImageIconSize.Small}
                                        rounded
                                    />
                                    <span className="text-body-md">{validatorName}</span>
                                </div>
                                <AddressLink
                                    address={address}
                                    copyText={address}
                                    showAddressAlias={false}
                                />
                            </div>
                        ) : (
                            <AddressLink address={address} copyText={address} />
                        )}
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Operation',
            id: 'operation',
            cell: ({ row: { original: event } }) => {
                const isStake = event.type === STAKING_REQUEST_EVENT;
                return (
                    <TableCellBase>
                        <TableCellText>{isStake ? 'Stake' : 'Withdraw'}</TableCellText>
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
                    ? (parsedJson as StakeEventJson).epoch
                    : (parsedJson as UnstakeEventJson).unstaking_epoch;
                return (
                    <TableCellBase>
                        <TableCellText>
                            {epoch !== undefined ? (
                                <EpochLink epoch={epoch}>{`Epoch ${epoch}`}</EpochLink>
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
