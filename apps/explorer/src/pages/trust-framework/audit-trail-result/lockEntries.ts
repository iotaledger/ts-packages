// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    MILLISECONDS_PER_SECOND,
    SECONDS_PER_DAY,
    SECONDS_PER_MINUTE,
    MINUTES_PER_HOUR,
} from '@iota/core';
import {
    LockingWindowType,
    TimeLockType,
    type LockingConfig,
    type LockingWindow,
    type TimeLock,
} from '@iota/audit-trails/web';
import { type LockEntry } from '../notarization-result/views/LockLifecycleView';

const RECORD_WINDOW_TITLE = 'Delete Record Window';

export function toAuditTrailLocks(lockingConfig: LockingConfig | undefined): LockEntry[] {
    if (!lockingConfig) {
        return [];
    }

    return [
        toLockEntry('Write Lock', 'record write', lockingConfig.writeLock),
        toLockEntry('Delete Trail Lock', 'trail delete', lockingConfig.deleteTrailLock),
        toRecordWindowEntry(lockingConfig.deleteRecordWindow),
    ];
}

function toLockEntry(title: string, operation: string, lock: TimeLock): LockEntry {
    switch (lock.type) {
        case TimeLockType.None:
            return {
                title,
                kind: 'unlocked',
                typeLabel: 'None',
                tooltip: `The ${operation} operation is not locked and can be performed at any time.`,
            };
        case TimeLockType.UntilDestroyed:
            return {
                title,
                kind: 'permanent',
                typeLabel: 'UntilDestroyed',
                tooltip: `The ${operation} operation is permanently locked and cannot be performed.`,
            };
        case TimeLockType.Infinite:
            return {
                title,
                kind: 'permanent',
                typeLabel: 'Infinite',
                tooltip: `The ${operation} operation is permanently locked and cannot be performed.`,
            };
        case TimeLockType.UnlockAt:
        case TimeLockType.UnlockAtMs: {
            const unlockAtMs =
                lock.type === TimeLockType.UnlockAtMs
                    ? Number(lock.args)
                    : Number(lock.args) * MILLISECONDS_PER_SECOND;
            return {
                title,
                kind: unlockAtMs <= Date.now() ? 'unlocked' : 'timeLocked',
                typeLabel: 'UnlockAt',
                unlockAtMs,
                tooltip: `The ${operation} operation is time-locked and becomes available after the expiration date.`,
            };
        }
    }
}

function toRecordWindowEntry(window: LockingWindow): LockEntry {
    switch (window.type) {
        case LockingWindowType.None:
            return {
                title: RECORD_WINDOW_TITLE,
                kind: 'unlocked',
                typeLabel: 'None',
                tooltip: 'Records can be deleted at any time.',
            };
        case LockingWindowType.TimeBased:
            return {
                title: RECORD_WINDOW_TITLE,
                kind: 'permanent',
                typeLabel: 'TimeBased',
                detail: `Records younger than ${formatWindowDuration(Number(window.args))} are locked against deletion.`,
                tooltip:
                    'Each record stays locked against deletion until it reaches the configured age.',
            };
        case LockingWindowType.CountBased:
            return {
                title: RECORD_WINDOW_TITLE,
                kind: 'permanent',
                typeLabel: 'CountBased',
                detail: `The ${window.args} most recent records are locked against deletion.`,
                tooltip:
                    'The newest records stay locked against deletion until enough newer records are appended.',
            };
    }
}

function formatWindowDuration(seconds: number): string {
    const days = Math.floor(seconds / SECONDS_PER_DAY);
    const hours = Math.floor((seconds % SECONDS_PER_DAY) / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR));
    const minutes = Math.floor(
        (seconds % (SECONDS_PER_MINUTE * MINUTES_PER_HOUR)) / SECONDS_PER_MINUTE,
    );

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(' ') : `${seconds}s`;
}
