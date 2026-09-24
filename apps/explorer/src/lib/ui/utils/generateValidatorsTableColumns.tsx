// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeSize, BadgeType, TableCellBase, TableCellText } from '@iota/apps-ui-kit';
import type { ColumnDef } from '@tanstack/react-table';
import {
    type ApyByValidator,
    type IotaValidatorSummaryExtended,
    formatPercentageDisplay,
    getValidatorEffectiveCommission,
    ImageIcon,
    ImageIconSize,
    useCopyToClipboard,
} from '@iota/core';
import { ampli, getValidatorMoveEvent } from '~/lib';
import { StakeColumn } from '~/components';
import type { IotaEvent } from '@iota/iota-sdk/client';
import clsx from 'clsx';
import { ValidatorLink } from '~/components/ui';
import { Copy } from '@iota/apps-ui-icons';

interface GenerateValidatorsTableColumnsArgs {
    committeeMembers?: string[];
    atRiskValidators?: [string, string][];
    maxCommitteeSize?: number;
    validatorEvents?: IotaEvent[];
    rollingAverageApys?: ApyByValidator;
    showValidatorIcon?: boolean;
    includeColumns?: string[];
    highlightValidatorName?: boolean;
    currentEpoch?: string;
}

function ValidatorWithImage({
    validator,
    highlightValidatorName,
    committeeMembers = [],
    atRiskAddresses = new Set(),
}: {
    validator: IotaValidatorSummaryExtended;
    highlightValidatorName?: boolean;
    committeeMembers?: string[];
    atRiskAddresses?: Set<string>;
}) {
    const validatorAddress = validator.iotaAddress;
    const isValidatorCommitteeMember = committeeMembers.includes(validatorAddress);
    const isAtRisk = atRiskAddresses.has(validatorAddress);
    const truncatedAddress = `${validatorAddress.slice(0, 8)}\u2026${validatorAddress.slice(-6)}`;
    const copyToClipboard = useCopyToClipboard();

    const statusBadges = validator.isPending
        ? [{ type: BadgeType.Warning, label: 'Pending' }]
        : validator.isCandidate
          ? [{ type: BadgeType.Neutral, label: 'Candidate' }]
          : isValidatorCommitteeMember
            ? [{ type: BadgeType.Success, label: 'Committee' }]
            : [{ type: BadgeType.PrimarySoft, label: 'Active' }];

    if (isAtRisk) {
        statusBadges.push({ type: BadgeType.Error, label: 'At Risk' });
    }

    const validatorNameContainer = (
        <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
                <span
                    className={clsx('truncate text-label-lg', {
                        'text-iota-neutral-10 dark:text-iota-neutral-92': highlightValidatorName,
                        'text-iota-neutral-40 dark:text-iota-neutral-60': !highlightValidatorName,
                    })}
                >
                    {validator.name}
                </span>
                {statusBadges.map((badge) => (
                    <Badge
                        key={badge.label}
                        type={badge.type}
                        label={badge.label}
                        size={BadgeSize.Small}
                    />
                ))}
            </div>
            <div className="flex items-center gap-1">
                <span className="text-label-sm tabular-nums text-iota-neutral-40 dark:text-iota-neutral-60">
                    {truncatedAddress}
                </span>
                <button
                    type="button"
                    aria-label="Copy address"
                    className="flex items-center text-iota-neutral-40 transition-colors hover:text-iota-neutral-10 dark:text-iota-neutral-60 dark:hover:text-iota-neutral-92"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        copyToClipboard(validatorAddress);
                    }}
                >
                    <Copy className="h-3 w-3" />
                </button>
            </div>
        </div>
    );

    const avatarElement = (
        <div className="h-8 w-8 shrink-0">
            <ImageIcon
                src={validator.imageUrl}
                label={validator.name}
                fallback={validator.name}
                size={ImageIconSize.Medium}
                rounded
            />
        </div>
    );

    return (
        <ValidatorLink
            address={validator.iotaAddress}
            showAddressAlias={false}
            onClick={() =>
                ampli.clickedValidatorRow({
                    sourceFlow: 'Epoch details',
                    validatorAddress: validator.iotaAddress,
                    validatorName: validator.name,
                })
            }
            label={
                <div className="flex items-center gap-x-2.5 text-iota-neutral-40 dark:text-iota-neutral-60">
                    {avatarElement}
                    {validatorNameContainer}
                </div>
            }
        />
    );
}

export function generateValidatorsTableColumns({
    committeeMembers = [],
    atRiskValidators = [],
    validatorEvents = [],
    rollingAverageApys,
    showValidatorIcon = true,
    includeColumns,
    highlightValidatorName,
    currentEpoch,
}: GenerateValidatorsTableColumnsArgs): ColumnDef<IotaValidatorSummaryExtended>[] {
    const atRiskAddressSet = new Set(atRiskValidators.map(([address]) => address));
    let columns: ColumnDef<IotaValidatorSummaryExtended>[] = [
        {
            header: 'Validator',
            id: 'name',
            accessorKey: 'name',
            enableSorting: true,
            sortingFn: (row1, row2, columnId) => {
                const value1 = row1.getValue<string>(columnId);
                const value2 = row2.getValue<string>(columnId);
                return sortByString(value1, value2);
            },
            cell({ row }) {
                const { original: validator } = row;
                return (
                    <TableCellBase>
                        {showValidatorIcon ? (
                            <ValidatorWithImage
                                validator={validator}
                                highlightValidatorName={highlightValidatorName}
                                committeeMembers={committeeMembers}
                                atRiskAddresses={atRiskAddressSet}
                            />
                        ) : (
                            <TableCellText>
                                <span
                                    className={
                                        highlightValidatorName
                                            ? 'text-iota-neutral-10 dark:text-iota-neutral-92'
                                            : undefined
                                    }
                                >
                                    {validator.name}
                                </span>
                            </TableCellText>
                        )}
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Stake',
            accessorKey: 'stakingPoolIotaBalance',
            enableSorting: true,
            sortingFn: (rowA, rowB, columnId) =>
                BigInt(rowA.getValue(columnId)) - BigInt(rowB.getValue(columnId)) > 0 ? 1 : -1,
            cell({ getValue }) {
                const stakingPoolIotaBalance = getValue<string>();
                return (
                    <TableCellBase>
                        <StakeColumn stake={stakingPoolIotaBalance} />
                    </TableCellBase>
                );
            },
        },
        {
            header: 'APY',
            id: 'apy',
            accessorFn: (validator) =>
                rollingAverageApys?.[validator.iotaAddress]?.apy || undefined,
            enableSorting: true,
            sortUndefined: 'last',
            cell({ row }) {
                const { iotaAddress } = row.original;
                const { apy, isApyApproxZero } = rollingAverageApys?.[iotaAddress] ?? {
                    apy: null,
                };
                return (
                    <TableCellBase>
                        <TableCellText>
                            {formatPercentageDisplay(apy, '--', isApyApproxZero)}
                        </TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Effective Commission',
            id: 'effectiveCommissionRate',
            accessorFn: (validator) => {
                const rate = validator.effectiveCommissionRate;
                return rate != null ? Number(rate) / 100 : undefined;
            },
            enableSorting: true,
            sortUndefined: 'last',
            cell({ row }) {
                return (
                    <TableCellBase>
                        <TableCellText>
                            {getValidatorEffectiveCommission(row.original)}
                        </TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Voting Power',
            id: 'votingPower',
            meta: {
                tooltip:
                    "This validator's share of total committee voting power, proportional to its stake. Determines influence over consensus.",
            },
            accessorFn: (validator) => {
                if (validator.isCandidate || validator.isPending) return undefined;
                const power = Number(validator.votingPower);
                return isNaN(power) ? undefined : power;
            },
            enableSorting: true,
            sortUndefined: 'last',
            cell({ row }) {
                const { isCandidate, isPending, votingPower } = row.original;
                const power = Number(votingPower);
                return (
                    <TableCellBase>
                        <TableCellText>
                            {isCandidate || isPending || isNaN(power) ? '--' : `${power / 100}%`}
                        </TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Last Epoch Rewards',
            id: 'lastReward',
            meta: {
                tooltip:
                    "Total staking rewards distributed to this validator's pool at the end of the previous epoch.",
            },
            accessorFn: (validator) =>
                getLastReward(validatorEvents, validator.iotaAddress, currentEpoch),
            enableSorting: true,
            sortUndefined: 'last',
            cell({ getValue }) {
                const lastReward = getValue<number | undefined>();
                return (
                    <TableCellBase>
                        {lastReward !== undefined ? (
                            <StakeColumn stake={lastReward} />
                        ) : (
                            <TableCellText>--</TableCellText>
                        )}
                    </TableCellBase>
                );
            },
        },
    ];

    if (includeColumns) {
        columns = columns.filter((col) =>
            includeColumns.includes(col.header?.toString() as string),
        );
    }

    return columns;
}
function sortByString(value1: string, value2: string) {
    return value1.localeCompare(value2, undefined, { sensitivity: 'base' });
}

function getLastReward(
    validatorEvents: IotaEvent[],
    iotaAddress: string,
    currentEpoch?: string,
): number | undefined {
    const event = getValidatorMoveEvent(validatorEvents, iotaAddress, currentEpoch) as {
        pool_staking_reward?: string;
    };
    return event?.pool_staking_reward ? Number(event.pool_staking_reward) : undefined;
}
