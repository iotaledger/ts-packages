// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { LockLocked, LockUnlocked, Info } from '@iota/apps-ui-icons';
import {
    Badge,
    BadgeType,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    KeyValueInfo,
    Title,
    TitleSize,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { formatDate, useCountdownByTimestamp } from '@iota/core';
import { CollapsibleCard, ErrorBoundary } from '~/components';

export type LockStatusKind = 'unlocked' | 'timeLocked' | 'permanent';

export interface LockEntry {
    title: string;
    kind: LockStatusKind;
    typeLabel: string;
    unlockAtMs?: number;
    detail?: string;
    tooltip: string;
}

interface LockLifecycleViewProps {
    locks?: LockEntry[];
}

export function LockLifecycleView({ locks }: LockLifecycleViewProps): React.JSX.Element {
    if (!locks?.length) {
        return (
            <ErrorBoundary>
                <div className="flex w-full flex-col gap-sm">
                    <Title
                        title="Lock Lifecycle"
                        tooltipPosition={TooltipPosition.Top}
                        tooltipText="View the lock lifecycle governing transfer, update, and delete operations on this notarization."
                    />
                    <div className="flex flex-col">
                        <InfoBox
                            supportingText="No lock configuration found."
                            icon={<Info />}
                            type={InfoBoxType.Default}
                            style={InfoBoxStyle.Elevated}
                        />
                    </div>
                </div>
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <div className="flex w-full flex-col gap-sm">
                <Title
                    title="Lock Lifecycle"
                    tooltipPosition={TooltipPosition.Top}
                    tooltipText="View the lock lifecycle governing transfer, update, and delete operations on this notarization."
                />
                <div className="flex flex-col gap-sm">
                    {locks.map((lock, index) => (
                        <LockCard key={index} lock={lock} />
                    ))}
                </div>
            </div>
        </ErrorBoundary>
    );
}

function LockCard({ lock }: { lock: LockEntry }) {
    const { badgeType, badgeLabel, icon } = getLockBadgeStyle(lock);

    return (
        <CollapsibleCard
            collapsible
            title={lock.title}
            titleSize={TitleSize.Small}
            supportingTitleElement={
                <div className="ml-1 flex">
                    <Badge label={badgeLabel} type={badgeType} icon={icon} />
                </div>
            }
        >
            <div className="flex flex-col gap-4 py-sm--rs">
                <div className="flex flex-wrap px-md--rs">
                    <KeyValueInfo
                        keyText="Lock Type"
                        value={lock.typeLabel}
                        fullwidth
                        tooltipPosition={TooltipPosition.Top}
                        tooltipText={lock.tooltip}
                    />
                </div>
                {lock.detail && (
                    <div className="flex flex-wrap px-md--rs">
                        <KeyValueInfo keyText="Policy" value={lock.detail} fullwidth />
                    </div>
                )}
                <LockExpiration unlockAtMs={lock.unlockAtMs} />
            </div>
        </CollapsibleCard>
    );
}

interface LockExpirationProps {
    unlockAtMs: number | undefined;
}
function LockExpiration({ unlockAtMs }: LockExpirationProps): JSX.Element | null {
    const countdown = useCountdownByTimestamp(unlockAtMs ?? null);

    if (!unlockAtMs) {
        return null;
    }

    const formattedDate = formatDate(new Date(unlockAtMs), [
        'year',
        'month',
        'day',
        'hour',
        'minute',
    ]);

    return (
        <div className="flex flex-wrap px-md--rs">
            <KeyValueInfo
                keyText="Unlocks at"
                value={countdown ? `${formattedDate} (${countdown})` : formattedDate}
                fullwidth
                tooltipPosition={TooltipPosition.Top}
                tooltipText={`This lock expires on ${formattedDate}. After expiration the operation becomes available.`}
            />
        </div>
    );
}

function getLockBadgeStyle(lock: LockEntry): {
    badgeType: BadgeType;
    badgeLabel: string;
    icon: React.JSX.Element;
} {
    switch (lock.kind) {
        case 'unlocked':
            return {
                badgeType: BadgeType.PrimarySoft,
                badgeLabel: 'Unlocked',
                icon: <LockUnlocked className="h-4 w-4" />,
            };
        case 'timeLocked':
            return {
                badgeType: BadgeType.Neutral,
                badgeLabel: 'Time Locked',
                icon: <LockLocked className="h-4 w-4" />,
            };
        case 'permanent':
            return {
                badgeType: BadgeType.Neutral,
                badgeLabel: 'Permanently Locked',
                icon: <LockLocked className="h-4 w-4" />,
            };
    }
}
