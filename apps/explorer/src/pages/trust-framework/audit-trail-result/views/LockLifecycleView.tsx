// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { LockLocked, LockUnlocked, Info } from '@iota/apps-ui-icons';
import {
    BadgeType,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    KeyValueInfo,
    Title,
    TitleSize,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { formatDate } from '@iota/core';
// TODO: use '@iota/audit-trail/web' after published
import {
    type LockingConfig,
    type LockingWindow,
    type TimeLock,
    TimeLockType,
    LockingWindowType,
} from '@iota/audit-trail';
import { CollapsibleCard, ErrorBoundary, IconBadge } from '~/components';
import { useEffect, useState } from 'react';

type AnyLock = TimeLock | LockingWindow;

interface LockLifecycleViewProps {
    lockingConfig: LockingConfig | undefined;
}

export function LockLifecycleView({ lockingConfig }: LockLifecycleViewProps): JSX.Element {
    console.log('locking config', lockingConfig);
    if (lockingConfig == null) {
        return (
            <ErrorBoundary>
                <div className="flex w-full flex-col gap-sm">
                    <Title
                        title="Locks and Lifecycle"
                        tooltipPosition={TooltipPosition.Left}
                        tooltipText="View the lock lifecycle governing write, delete trail, and delete record operations on this audit trail."
                    />
                    <div className="flex flex-col">
                        <InfoBox
                            supportingText="No lock configuration found for this audit trail."
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
                    title="Locks and Lifecycle"
                    tooltipPosition={TooltipPosition.Left}
                    tooltipText="View the lock lifecycle governing write, delete trail, and delete record operations on this audit trail."
                />
                <div className="flex flex-col gap-sm">
                    <LockCard
                        operation={AuditTrailLockOperations.Write}
                        lock={lockingConfig.writeLock}
                    />
                    <LockCard
                        operation={AuditTrailLockOperations.DeleteTrail}
                        lock={lockingConfig.deleteTrailLock}
                    />
                    <LockCard
                        operation={AuditTrailLockOperations.DeleteRecordWindow}
                        lock={lockingConfig.deleteRecordWindow}
                    />
                </div>
            </div>
        </ErrorBoundary>
    );
}

enum LockType {
    TimeLock,
    LockingWindow,
}

type LockOperation = {
    label: string;
    lockType: LockType;
};

const AuditTrailLockOperations = {
    Write: { label: 'Write', lockType: LockType.TimeLock },
    DeleteTrail: { label: 'Delete Trail', lockType: LockType.TimeLock },
    DeleteRecordWindow: { label: 'Delete Record', lockType: LockType.LockingWindow },
};

interface LockCardProps {
    operation: LockOperation;
    lock: AnyLock;
}

function LockCard({ operation, lock }: LockCardProps): JSX.Element {
    const badgeStyle = getLockBadgeStyle(lock, operation.lockType);
    const { badgeType, badgeLabel, icon } = badgeStyle || {};

    return (
        <CollapsibleCard
            collapsible
            title={`${operation.label} Lock`}
            titleSize={TitleSize.Small}
            supportingTitleElement={
                badgeStyle && (
                    <div className="ml-1 flex">
                        <IconBadge label={badgeLabel!} type={badgeType!} icon={icon!} />
                    </div>
                )
            }
        >
            <div className="flex flex-col gap-4 py-sm--rs">
                <LockDetails operation={operation} lock={lock} />
            </div>
        </CollapsibleCard>
    );
}

function LockDetails({
    operation,
    lock,
}: {
    operation: LockOperation;
    lock: AnyLock;
}): JSX.Element {
    const isTimeLock = operation.lockType === LockType.TimeLock;

    return (
        <div className="flex flex-col gap-4 px-md--rs">
            <KeyValueInfo
                keyText="Lock Type"
                value={
                    isTimeLock
                        ? getTimeLockTypeValue(lock as TimeLock)
                        : getLockingWindowTypeValue(lock as LockingWindow)
                }
                fullwidth
                tooltipPosition={TooltipPosition.Left}
                tooltipText={getLockTypeTooltip(operation, lock)}
            />
            {isTimeLock ? (
                <TimeLockExpiration timeLock={lock as TimeLock} />
            ) : (
                <LockWindowDetails lockWindow={lock as LockingWindow} />
            )}
        </div>
    );
}

function getTimeLockTypeValue(lock: TimeLock): string {
    switch (lock.type) {
        case TimeLockType.None:
            return 'None';
        case TimeLockType.UnlockAt:
            return 'UnlockAt';
        case TimeLockType.UnlockAtMs:
            return 'UnlockAtMs';
        case TimeLockType.UntilDestroyed:
            return 'UntilDestroyed';
        case TimeLockType.Infinite:
            return 'Infinite';
    }
}

function getLockingWindowTypeValue(lock: LockingWindow): string {
    switch (lock.type) {
        case LockingWindowType.None:
            return 'None';
        case LockingWindowType.CountBased:
            return 'CountBased';
        case LockingWindowType.TimeBased:
            return 'TimeBased';
    }
}

function TimeLockExpiration({ timeLock }: { timeLock: TimeLock }): JSX.Element | null {
    if (!(timeLock.type == TimeLockType.UnlockAt || timeLock.type == TimeLockType.UnlockAtMs)) {
        return null;
    }

    const unlockDate = new Date(Number(timeLock.args) * 1000);
    const formattedDate = formatDate(unlockDate, ['year', 'month', 'day', 'hour', 'minute']);
    const countdown = useCountdown(unlockDate);

    return (
        <KeyValueInfo
            keyText="Unlocks at"
            value={`${formattedDate} (${countdown})`}
            fullwidth
            tooltipPosition={TooltipPosition.Left}
            tooltipText={`This lock expires on ${formattedDate}. After expiration the operation becomes available.`}
        />
    );
}

function LockWindowDetails({ lockWindow }: { lockWindow: LockingWindow }): JSX.Element | null {
    if (lockWindow.type !== LockingWindowType.TimeBased) {
        return null;
    }
    const startDate = new Date(Number(lockWindow.args.start_at) * 1000);
    const endDate = new Date(Number(lockWindow.args.end_at) * 1000);
    const formattedStartDate = formatDate(startDate, ['year', 'month', 'day', 'hour', 'minute']);
    const formattedEndDate = formatDate(endDate, ['year', 'month', 'day', 'hour', 'minute']);
    const countdown = useCountdown(isWindowActive(lockWindow) ? endDate : startDate);

    return (
        <>
            <KeyValueInfo keyText="Window Starts" value={formattedStartDate} fullwidth />
            <KeyValueInfo keyText="Window Ends" value={formattedEndDate} fullwidth />
            <KeyValueInfo keyText="Status" value={countdown} fullwidth />
        </>
    );
}

function useCountdown(targetDate: Date): string {
    const [now, setNow] = useState(() => Date.now());
    const isPast = targetDate.getTime() - now <= 0;

    useEffect(() => {
        if (isPast) return;
        const interval = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(interval);
    }, [isPast]);

    if (isPast) return 'Window Expired';

    const diffMs = targetDate.getTime() - now;
    const totalMinutes = Math.floor(diffMs / 60_000);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const days = Math.floor(totalHours / 24);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(' ') + ' remaining' : 'Less than a minute';
}

function getLockTypeTooltip(operation: LockOperation, lock: AnyLock): string {
    const op = operation.label.toLowerCase();
    const isTimeLock = operation.lockType === LockType.TimeLock;

    if (isTimeLock) {
        return getTimeLockTooltip(op, lock as TimeLock);
    } else {
        return getLockingWindowTooltip(op, lock as LockingWindow);
    }
}

function getTimeLockTooltip(op: string, lock: TimeLock): string {
    switch (lock.type) {
        case TimeLockType.None:
            return `The ${op} operation is not locked and can be performed at any time.`;
        case TimeLockType.UnlockAt:
            return `The ${op} operation is time-locked and will become available after the expiration date.`;
        case TimeLockType.UnlockAtMs:
            return `The ${op} operation is time-locked and will become available after the expiration time.`;
        case TimeLockType.UntilDestroyed:
            return `The ${op} operation is permanently locked and cannot be performed.`;
        case TimeLockType.Infinite:
            return `The ${op} operation is permanently locked and cannot be performed.`;
    }
}

function getLockingWindowTooltip(op: string, lock: LockingWindow): string {
    switch (lock.type) {
        case LockingWindowType.None:
            return `The ${op} operation is not locked and can be performed at any time.`;
        case LockingWindowType.CountBased:
            return ``;
        case LockingWindowType.TimeBased:
            return ``;
    }
}

enum LockStatus {
    Unlocked = 'Unlocked',
    TimeLocked = 'Time Locked',
    PermanentlyLocked = 'Permanently Locked',
    WindowActive = 'Window Active',
    WindowInactive = 'Window Inactive',
    WindowExpired = 'Window Expired',
}

type LockBadgeStyle = {
    badgeType: BadgeType;
    badgeLabel: LockStatus;
    icon: JSX.Element;
};

function getLockBadgeStyle(lock: AnyLock, lockType: LockType): LockBadgeStyle | null {
    const isLockingWindow = lockType === LockType.LockingWindow;

    if (isLockingWindow) {
        const windowLock = lock as LockingWindow;
        if (isWindowActive(windowLock)) {
            return {
                badgeType: BadgeType.Success,
                badgeLabel: LockStatus.WindowActive,
                icon: <LockUnlocked className="h-4 w-4" />,
            } as LockBadgeStyle;
        }
        if (isWindowExpired(windowLock)) {
            return {
                badgeType: BadgeType.Neutral,
                badgeLabel: LockStatus.WindowExpired,
                icon: <LockLocked className="h-4 w-4" />,
            } as LockBadgeStyle;
        }
        return {
            badgeType: BadgeType.Neutral,
            badgeLabel: LockStatus.WindowInactive,
            icon: <LockLocked className="h-4 w-4" />,
        } as LockBadgeStyle;
    }

    const timeLock = lock as TimeLock;
    switch (timeLock.type) {
        case TimeLockType.None:
            return {
                badgeType: BadgeType.PrimarySoft,
                badgeLabel: LockStatus.Unlocked,
                icon: <LockUnlocked className="h-4 w-4" />,
            } as LockBadgeStyle;
        case TimeLockType.UnlockAt:
            if (Date.now() >= Number(timeLock.args) * 1000) {
                return {
                    badgeType: BadgeType.PrimarySoft,
                    badgeLabel: LockStatus.Unlocked,
                    icon: <LockUnlocked className="h-4 w-4" />,
                } as LockBadgeStyle;
            }
            return {
                badgeType: BadgeType.Neutral,
                badgeLabel: LockStatus.TimeLocked,
                icon: <LockLocked className="h-4 w-4" />,
            } as LockBadgeStyle;
        case TimeLockType.UntilDestroyed:
            return {
                badgeType: BadgeType.Neutral,
                badgeLabel: LockStatus.PermanentlyLocked,
                icon: <LockLocked className="h-4 w-4" />,
            } as LockBadgeStyle;
    }

    return null;
}

function isWindowActive(lock: LockingWindow): boolean {
    const now = Date.now();
    const start = Number(lock.args.start_at) * 1000;
    const end = Number(lock.args.end_at) * 1000;
    return now >= start && now <= end;
}

function isWindowExpired(lock: LockingWindow): boolean {
    const now = Date.now();
    const end = Number(lock.args.end_at) * 1000;
    return now > end;
}
