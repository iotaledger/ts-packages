// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { LockLocked, LockUnlocked, Flag } from '@iota/apps-ui-icons';
import { BadgeType } from '@iota/apps-ui-kit';
import {
    type LockingWindow,
    type TimeLock,
    LockingWindowType,
    TimeLockType,
} from '@iota/audit-trail';
import { type ReactNode } from 'react';

export type UIState = 'UNLOCKED' | 'TIME_LOCKED' | 'PERMANENTLY_LOCKED' | 'POLICY_ACTIVE';

/**
 * Functional Discriminated Union representing the UI state for a lock.
 */
export interface LockUIState {
    state: UIState;
    badgeType: BadgeType;
    badgeLabel: string;
    icon: ReactNode;
    tooltip: string;
    typeLabel: string;
}

export function parseTimeLockState(lock: TimeLock, operationLabel: string): LockUIState {
    const op = operationLabel.toLowerCase();
    switch (lock.type) {
        case TimeLockType.None:
            return {
                state: 'UNLOCKED',
                badgeType: BadgeType.PrimarySoft,
                badgeLabel: 'Unlocked',
                icon: <LockUnlocked className="h-4 w-4" />,
                tooltip: `The ${op} operation is not locked and can be performed at any time.`,
                typeLabel: 'None',
            };
        case TimeLockType.UnlockAt:
        case TimeLockType.UnlockAtMs: {
            const unlockMs =
                lock.type === TimeLockType.UnlockAt ? Number(lock.args) * 1000 : Number(lock.args);
            const isUnlocked = Date.now() >= unlockMs;
            return {
                state: isUnlocked ? 'UNLOCKED' : 'TIME_LOCKED',
                badgeType: isUnlocked ? BadgeType.PrimarySoft : BadgeType.Neutral,
                badgeLabel: isUnlocked ? 'Unlocked' : 'Time Locked',
                icon: isUnlocked ? (
                    <LockUnlocked className="h-4 w-4" />
                ) : (
                    <LockLocked className="h-4 w-4" />
                ),
                tooltip: `The ${op} operation is time-locked and will become available after the expiration ${
                    lock.type === TimeLockType.UnlockAt ? 'date' : 'time'
                }.`,
                typeLabel: lock.type === TimeLockType.UnlockAt ? 'UnlockAt' : 'UnlockAtMs',
            };
        }
        case TimeLockType.UntilDestroyed:
        case TimeLockType.Infinite:
            return {
                state: 'PERMANENTLY_LOCKED',
                badgeType: BadgeType.Neutral,
                badgeLabel: 'Permanently Locked',
                icon: <LockLocked className="h-4 w-4" />,
                tooltip: `The ${op} operation is permanently locked and cannot be performed.`,
                typeLabel:
                    lock.type === TimeLockType.UntilDestroyed ? 'UntilDestroyed' : 'Infinite',
            };
    }
}

export function parseLockingWindowState(lock: LockingWindow, operationLabel: string): LockUIState {
    const op = operationLabel.toLowerCase();
    switch (lock.type) {
        case LockingWindowType.None:
            return {
                state: 'UNLOCKED',
                badgeType: BadgeType.PrimarySoft,
                badgeLabel: 'Unlocked',
                icon: <LockUnlocked className="h-4 w-4" />,
                tooltip: `The ${op} operation is not locked and can be performed at any time.`,
                typeLabel: 'None',
            };
        case LockingWindowType.TimeBased:
            return {
                state: 'POLICY_ACTIVE',
                badgeType: BadgeType.Neutral,
                badgeLabel: 'Policy Active',
                icon: <Flag className="h-4 w-4" />,
                tooltip: `The ${op} operation is governed by a time-based policy and applies relative to record creation.`,
                typeLabel: 'TimeBased',
            };
        case LockingWindowType.CountBased:
            return {
                state: 'POLICY_ACTIVE',
                badgeType: BadgeType.Neutral,
                badgeLabel: 'Policy Active',
                icon: <Flag className="h-4 w-4" />,
                tooltip: `The ${op} operation is governed by a count-based policy and applies relative to record creation.`,
                typeLabel: 'CountBased',
            };
    }
}
