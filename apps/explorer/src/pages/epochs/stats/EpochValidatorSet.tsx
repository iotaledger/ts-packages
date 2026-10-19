// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Info } from '@iota/apps-ui-icons';
import { Panel, Title, Tooltip, TooltipPosition } from '@iota/apps-ui-kit';
import { ImageIcon, ImageIconSize } from '@iota/core';
import type { IotaValidatorSummary } from '@iota/iota-sdk/client';
import { CoinFormat, formatBalance, IOTA_DECIMALS } from '@iota/iota-sdk/utils';
import cx from 'clsx';
import { useState } from 'react';
import { LinkWithQuery, useNavigateWithQuery } from '~/components/ui';
import { getInternalPath } from '~/lib/utils';
import { LINK_HIGHLIGHT_CLASSES } from '../utils';

const NAMED_VALIDATORS = 6;

// Voting power is expressed in basis points, so 100 equals 1%.
const formatVotingPower = (basisPoints: number) => `${(basisPoints / 100).toFixed(1)}%`;

const sumVotingPower = (validators: IotaValidatorSummary[]) =>
    validators.reduce((sum, { votingPower }) => sum + Number(votingPower), 0);

const getShadeOpacity = (index: number) => 1 - index * 0.08;

const OTHER_SEGMENT = 'other';

const LEGEND_ITEM_CLASSES = 'flex min-w-0 flex-row items-center gap-xs';

interface EpochValidatorSetProps {
    validators: IotaValidatorSummary[];
    committeeMembers: IotaValidatorSummary[];
}

export function EpochValidatorSet({
    validators,
    committeeMembers,
}: EpochValidatorSetProps): React.JSX.Element {
    const byVotingPower = [...committeeMembers].sort(
        (a, b) => Number(b.votingPower) - Number(a.votingPower),
    );
    const namedValidators = byVotingPower.slice(0, NAMED_VALIDATORS);
    const otherValidators = byVotingPower.slice(NAMED_VALIDATORS);
    const otherVotingPower = sumVotingPower(otherValidators);
    const namedVotingPower = sumVotingPower(namedValidators);

    const [highlightedSegment, setHighlightedSegment] = useState<string | null>(null);

    const counts = [
        {
            label: 'Active validators',
            value: validators.length,
            tooltipText: 'Every validator in the active set this epoch.',
        },
        {
            label: 'In committee',
            value: committeeMembers.length,
            tooltipText: 'Validators that vote on consensus and earn rewards this epoch.',
        },
        {
            label: 'Active, not in committee',
            value: validators.length - committeeMembers.length,
            tooltipText:
                "Active validators outside the committee. They don't vote or earn rewards this epoch.",
        },
    ];

    return (
        <Panel>
            <Title title="Validators in this epoch" />
            <div className="flex flex-col gap-lg p-md--rs md:flex-row md:justify-between">
                <div className="grid grid-cols-3 content-start gap-md md:w-1/2">
                    {counts.map((count) => (
                        <ValidatorCount key={count.label} {...count} />
                    ))}
                </div>

                <div className="flex w-full flex-col gap-sm md:w-1/2">
                    <div className="flex flex-row justify-between text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                        <span>Voting power distribution</span>
                        <span>
                            Top {namedValidators.length} hold {formatVotingPower(namedVotingPower)}
                        </span>
                    </div>

                    <div className="flex h-3 w-full gap-xxxs rounded-full bg-iota-primary-90 dark:bg-iota-primary-10">
                        {namedValidators.map((validator, index) => (
                            <VotingPowerBarSegment
                                key={validator.iotaAddress}
                                validator={validator}
                                opacity={getShadeOpacity(index)}
                                isFirst={index === 0}
                                isHighlighted={highlightedSegment === validator.iotaAddress}
                            />
                        ))}
                        {otherValidators.length > 0 && (
                            <BarSegment
                                votingPower={otherVotingPower}
                                tooltip={
                                    <span className="flex flex-col gap-xxxs text-body-sm">
                                        <span className="font-medium">
                                            Other {otherValidators.length} validators
                                        </span>
                                        <span>
                                            Voting power: {formatVotingPower(otherVotingPower)}
                                        </span>
                                    </span>
                                }
                                className="rounded-r-full bg-iota-neutral-80 dark:bg-iota-neutral-30"
                                isHighlighted={highlightedSegment === OTHER_SEGMENT}
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-x-md gap-y-xs text-body-sm sm:grid-cols-2">
                        {namedValidators.map((validator, index) => (
                            <VotingPowerLegendItem
                                key={validator.iotaAddress}
                                label={validator.name}
                                votingPower={Number(validator.votingPower)}
                                opacity={getShadeOpacity(index)}
                                to={getInternalPath('validator', validator.iotaAddress)}
                                onHighlight={(isOn) =>
                                    setHighlightedSegment(isOn ? validator.iotaAddress : null)
                                }
                            />
                        ))}
                        {otherValidators.length > 0 && (
                            <VotingPowerLegendItem
                                label={`Other ${otherValidators.length}`}
                                votingPower={otherVotingPower}
                                onHighlight={(isOn) =>
                                    setHighlightedSegment(isOn ? OTHER_SEGMENT : null)
                                }
                            />
                        )}
                    </div>
                </div>
            </div>
        </Panel>
    );
}

interface ValidatorCountProps {
    label: string;
    value: number;
    tooltipText: string;
}

function ValidatorCount({ label, value, tooltipText }: ValidatorCountProps) {
    return (
        <div className="flex flex-col gap-xxs">
            <span className="flex flex-row items-center gap-xxs text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                {label}
                <Tooltip text={tooltipText} position={TooltipPosition.Top}>
                    <Info className="opacity-40" />
                </Tooltip>
            </span>
            <span className="text-headline-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                {value}
            </span>
        </div>
    );
}

interface VotingPowerBarSegmentProps {
    validator: IotaValidatorSummary;
    opacity: number;
    isFirst: boolean;
    isHighlighted: boolean;
}

function VotingPowerBarSegment({
    validator,
    opacity,
    isFirst,
    isHighlighted,
}: VotingPowerBarSegmentProps) {
    const navigate = useNavigateWithQuery();
    const validatorPath = getInternalPath('validator', validator.iotaAddress);

    // Touch screens have no hover, so a tap only opens the tooltip and its validator link navigates.
    const openValidator = () => {
        if (!window.matchMedia('(hover: none)').matches) navigate(validatorPath, {});
    };

    return (
        <BarSegment
            votingPower={Number(validator.votingPower)}
            className={cx(
                'bg-iota-primary-30 dark:bg-iota-primary-80',
                isFirst && 'rounded-l-full',
            )}
            opacity={opacity}
            onClick={openValidator}
            isHighlighted={isHighlighted}
            tooltip={
                <span className="flex flex-col gap-xxxs text-body-sm">
                    <LinkWithQuery
                        to={validatorPath}
                        className="flex flex-row items-center gap-xs font-medium hover:underline"
                    >
                        <span className="size-8 shrink-0">
                            <ImageIcon
                                src={validator.imageUrl}
                                label={validator.name}
                                fallback={validator.name}
                                size={ImageIconSize.Medium}
                                rounded
                            />
                        </span>
                        <span className="break-words">{validator.name}</span>
                    </LinkWithQuery>
                    <span>Voting power: {formatVotingPower(Number(validator.votingPower))}</span>
                    <span>
                        Stake:{' '}
                        {formatBalance(
                            validator.stakingPoolIotaBalance,
                            IOTA_DECIMALS,
                            CoinFormat.Full,
                        )}{' '}
                        IOTA
                    </span>
                </span>
            }
        />
    );
}

interface BarSegmentProps {
    votingPower: number;
    tooltip: React.ReactNode;
    className: string;
    opacity?: number;
    onClick?: () => void;
    isHighlighted: boolean;
}

function BarSegment({
    votingPower,
    tooltip,
    className,
    opacity,
    onClick,
    isHighlighted,
}: BarSegmentProps) {
    return (
        <div
            className="h-full [&>div]:block [&>div]:h-full"
            style={{ width: formatVotingPower(votingPower) }}
        >
            <Tooltip text={tooltip} maxWidth="max-w-[260px]" open={isHighlighted}>
                <div
                    role={onClick ? 'link' : undefined}
                    tabIndex={0}
                    onClick={onClick}
                    onKeyDown={(event) => event.key === 'Enter' && onClick?.()}
                    className={cx(
                        'h-full transition-opacity hover:!opacity-100',
                        isHighlighted && '!opacity-100',
                        className,
                    )}
                    style={{ opacity }}
                />
            </Tooltip>
        </div>
    );
}

interface VotingPowerLegendItemProps {
    label: string;
    votingPower: number;
    opacity?: number;
    to?: string;
    onHighlight: (isHighlighted: boolean) => void;
}

function VotingPowerLegendItem({
    label,
    votingPower,
    opacity,
    to,
    onHighlight,
}: VotingPowerLegendItemProps) {
    const content = (
        <>
            <span
                className={
                    opacity === undefined
                        ? 'size-2 shrink-0 rounded-sm bg-iota-neutral-80 dark:bg-iota-neutral-30'
                        : 'size-2 shrink-0 rounded-sm bg-iota-primary-30 dark:bg-iota-primary-80'
                }
                style={{ opacity }}
            />
            <span className="min-w-0 break-words text-iota-neutral-10 dark:text-iota-neutral-92">
                {label}
            </span>
            <span className="ml-auto text-iota-neutral-40 dark:text-iota-neutral-60">
                {formatVotingPower(votingPower)}
            </span>
        </>
    );
    const highlightProps = {
        onMouseEnter: () => onHighlight(true),
        onMouseLeave: () => onHighlight(false),
        onFocus: () => onHighlight(true),
        onBlur: () => onHighlight(false),
    };

    return to ? (
        <LinkWithQuery
            to={to}
            className={cx(LEGEND_ITEM_CLASSES, LINK_HIGHLIGHT_CLASSES)}
            {...highlightProps}
        >
            {content}
        </LinkWithQuery>
    ) : (
        <div className={LEGEND_ITEM_CLASSES} {...highlightProps}>
            {content}
        </div>
    );
}
