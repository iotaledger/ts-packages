// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useState } from 'react';
import {
    CoinFiatValue,
    formatDelegatedStake,
    formatDelegatedTimelockedStake,
    ImageIcon,
    ImageIconSize,
    mapTimelockObjects,
    TIMELOCK_IOTA_TYPE,
    useFormatCoin,
    useGetAllOwnedObjects,
    useGetDelegatedStake,
    useGetTimelockedStakedObjects,
} from '@iota/core';
import { useIotaClientQuery } from '@iota/dapp-kit';
import {
    ButtonSegment,
    ButtonSegmentType,
    DisplayStats,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    LoadingIndicator,
    SegmentedButton,
    SegmentedButtonType,
    TableCellBase,
} from '@iota/apps-ui-kit';
import { Warning } from '@iota/apps-ui-icons';
import { formatAddress } from '@iota/iota-sdk/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { StakeColumn } from '../top-validators-card/StakeColumn';
import { TableCard, ValidatorLink } from '../ui';

const STAKED_TOOLTIP_TEXT = 'IOTA staked with validators. Cannot be used until unstaked.';
const TIMELOCKED_STAKED_TOOLTIP_TEXT =
    'Timelocked IOTA that is currently staked. Cannot be used until unstaked and the timelock expires.';
const TIMELOCKED_TOOLTIP_TEXT =
    "IOTA locked until a specific time. Depending on the lock's expiration, these funds can either be used for staking or collected when the timelock allows it.";
const REWARDS_TOOLTIP_TEXT =
    'Estimated rewards accrued across all delegations. Rewards are not part of the staked principal.';

enum StakingView {
    Staked = 'staked',
    TimelockedStaked = 'timelockedStaked',
}

interface DelegationRow {
    validatorAddress: string;
    principal: bigint;
    estimatedReward: bigint;
}

interface StakeLike {
    validatorAddress: string;
    principal: string;
    estimatedReward?: string;
}

function groupStakesByValidator(stakes: StakeLike[]): DelegationRow[] {
    const rowsByValidator = new Map<string, DelegationRow>();
    for (const stake of stakes) {
        const row = rowsByValidator.get(stake.validatorAddress) ?? {
            validatorAddress: stake.validatorAddress,
            principal: BigInt(0),
            estimatedReward: BigInt(0),
        };
        row.principal += BigInt(stake.principal);
        row.estimatedReward += BigInt(stake.estimatedReward || 0);
        rowsByValidator.set(stake.validatorAddress, row);
    }
    return [...rowsByValidator.values()].sort((a, b) => (b.principal > a.principal ? 1 : -1));
}

function sumRows(rows: DelegationRow[], key: 'principal' | 'estimatedReward'): bigint {
    return rows.reduce((acc, row) => acc + row[key], BigInt(0));
}

interface AddressStakingTabProps {
    address: string;
}

export function AddressStakingTab({ address }: AddressStakingTabProps): React.JSX.Element {
    const [view, setView] = useState<StakingView>(StakingView.Staked);

    const {
        data: delegatedStake,
        isPending: isDelegatedStakePending,
        isError: isDelegatedStakeErrored,
    } = useGetDelegatedStake({ address });
    const {
        data: timelockedStakedObjects,
        isPending: isTimelockedStakedPending,
        isError: isTimelockedStakedErrored,
    } = useGetTimelockedStakedObjects(address);
    const {
        data: timelockedObjects,
        isPending: isTimelockedPending,
        isError: isTimelockedErrored,
    } = useGetAllOwnedObjects(address, {
        StructType: TIMELOCK_IOTA_TYPE,
    });

    const stakedRows = useMemo(
        () => groupStakesByValidator(delegatedStake ? formatDelegatedStake(delegatedStake) : []),
        [delegatedStake],
    );
    const timelockedStakedRows = useMemo(
        () => groupStakesByValidator(formatDelegatedTimelockedStake(timelockedStakedObjects || [])),
        [timelockedStakedObjects],
    );
    const timelockedBalance = useMemo(
        () =>
            mapTimelockObjects(timelockedObjects || []).reduce(
                (acc, obj) => acc + BigInt(obj.locked.value),
                BigInt(0),
            ),
        [timelockedObjects],
    );

    if (isDelegatedStakePending || isTimelockedStakedPending || isTimelockedPending) {
        return (
            <div className="flex h-full min-h-14 w-full items-center justify-center">
                <LoadingIndicator />
            </div>
        );
    }

    if (isDelegatedStakeErrored || isTimelockedStakedErrored || isTimelockedErrored) {
        return (
            <InfoBox
                title="Error"
                supportingText="Failed to load staking data"
                icon={<Warning />}
                type={InfoBoxType.Error}
                style={InfoBoxStyle.Default}
            />
        );
    }

    const stakedBalance = sumRows(stakedRows, 'principal');
    const stakedRewards = sumRows(stakedRows, 'estimatedReward');
    const timelockedStakedBalance = sumRows(timelockedStakedRows, 'principal');
    const timelockedStakedRewards = sumRows(timelockedStakedRows, 'estimatedReward');
    const totalRewards = stakedRewards + timelockedStakedRewards;

    const hasStaked = stakedRows.length > 0;
    const hasTimelockedStaked = timelockedStakedRows.length > 0;

    if (!hasStaked && !hasTimelockedStaked && timelockedBalance === 0n) {
        return (
            <div className="flex h-full min-h-14 items-center justify-center">
                <span className="text-iota-neutral-40 dark:text-iota-neutral-60">
                    No Staked or Timelocked IOTA
                </span>
            </div>
        );
    }

    const effectiveView =
        view === StakingView.Staked && !hasStaked && hasTimelockedStaked
            ? StakingView.TimelockedStaked
            : view === StakingView.TimelockedStaked && !hasTimelockedStaked && hasStaked
              ? StakingView.Staked
              : view;
    const visibleRows = effectiveView === StakingView.Staked ? stakedRows : timelockedStakedRows;

    return (
        <div className="flex flex-col gap-lg">
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-4">
                {hasStaked && (
                    <StakingStat
                        label="Staked"
                        tooltipText={STAKED_TOOLTIP_TEXT}
                        value={stakedBalance}
                    />
                )}
                {hasTimelockedStaked && (
                    <StakingStat
                        label="Timelocked Staked"
                        tooltipText={TIMELOCKED_STAKED_TOOLTIP_TEXT}
                        value={timelockedStakedBalance}
                    />
                )}
                {timelockedBalance > 0n && (
                    <StakingStat
                        label="Timelocked"
                        tooltipText={TIMELOCKED_TOOLTIP_TEXT}
                        value={timelockedBalance}
                    />
                )}
                {totalRewards > 0n && (
                    <StakingStat
                        label="Estimated Rewards"
                        tooltipText={REWARDS_TOOLTIP_TEXT}
                        value={totalRewards}
                    />
                )}
            </div>
            {(hasStaked || hasTimelockedStaked) && (
                <div className="flex flex-col gap-sm">
                    {hasStaked && hasTimelockedStaked && (
                        <div className="flex flex-row">
                            <SegmentedButton type={SegmentedButtonType.Outlined}>
                                <ButtonSegment
                                    type={ButtonSegmentType.Rounded}
                                    label="Staked"
                                    selected={effectiveView === StakingView.Staked}
                                    onClick={() => setView(StakingView.Staked)}
                                />
                                <ButtonSegment
                                    type={ButtonSegmentType.Rounded}
                                    label="Timelocked Staked"
                                    selected={effectiveView === StakingView.TimelockedStaked}
                                    onClick={() => setView(StakingView.TimelockedStaked)}
                                />
                            </SegmentedButton>
                        </div>
                    )}
                    <DelegationsTable rows={visibleRows} />
                </div>
            )}
        </div>
    );
}

interface StakingStatProps {
    label: string;
    tooltipText: string;
    value: bigint;
}

function StakingStat({ label, tooltipText, value }: StakingStatProps): React.JSX.Element {
    const [roundedAmount, symbol] = useFormatCoin({ balance: value });
    return (
        <DisplayStats
            label={label}
            tooltipText={tooltipText}
            value={
                <div className="flex flex-row items-baseline gap-xxs">
                    <span>{roundedAmount}</span>
                    <span className="text-label-md opacity-40">{symbol}</span>
                    <CoinFiatValue amount={value} withParentheses={false} />
                </div>
            }
        />
    );
}

interface DelegationsTableProps {
    rows: DelegationRow[];
}

const DELEGATION_COLUMNS: ColumnDef<DelegationRow>[] = [
    {
        header: 'Validator',
        accessorKey: 'validatorAddress',
        cell({ getValue }) {
            return <ValidatorCell address={getValue<string>()} />;
        },
    },
    {
        header: 'Staked Amount',
        accessorKey: 'principal',
        cell({ getValue }) {
            return (
                <TableCellBase>
                    <div className="w-40">
                        <StakeColumn stake={getValue<bigint>()} />
                    </div>
                </TableCellBase>
            );
        },
    },
    {
        header: 'Estimated Rewards',
        accessorKey: 'estimatedReward',
        cell({ getValue }) {
            return (
                <TableCellBase>
                    <div className="w-40">
                        <StakeColumn stake={getValue<bigint>()} />
                    </div>
                </TableCellBase>
            );
        },
    },
];

function DelegationsTable({ rows }: DelegationsTableProps): React.JSX.Element {
    return <TableCard data={rows} columns={DELEGATION_COLUMNS} />;
}

interface ValidatorCellProps {
    address: string;
}

function ValidatorCell({ address }: ValidatorCellProps): React.JSX.Element {
    const { data: systemState } = useIotaClientQuery('getLatestIotaSystemState');
    const validator = systemState?.activeValidators.find(
        ({ iotaAddress }) => iotaAddress === address,
    );
    const name = validator?.name || formatAddress(address);

    return (
        <TableCellBase>
            <ValidatorLink
                address={address}
                showAddressAlias={false}
                label={
                    <div className="flex w-[280px] items-center gap-x-2.5 text-iota-neutral-40 dark:text-iota-neutral-60">
                        <div className="h-8 w-8 shrink-0">
                            <ImageIcon
                                src={validator?.imageUrl}
                                label={name}
                                fallback={name}
                                size={ImageIconSize.Medium}
                                rounded
                            />
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-label-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                                {name}
                            </span>
                            <span className="text-label-sm tabular-nums text-iota-neutral-40 dark:text-iota-neutral-60">
                                {formatAddress(address)}
                            </span>
                        </div>
                    </div>
                }
            />
        </TableCellBase>
    );
}
