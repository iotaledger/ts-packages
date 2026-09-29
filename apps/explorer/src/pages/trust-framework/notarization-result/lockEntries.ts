// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { MILLISECONDS_PER_SECOND } from '@iota/core';
import { type LockMetadata, type TimeLock } from '@iota/notarization/web';
import { type LockEntry } from './views/LockLifecycleView';

export function toNotarizationLocks(locking: LockMetadata | undefined): LockEntry[] {
    if (!locking) {
        return [];
    }

    return [
        toLockEntry('Transfer Lock', 'transfer', locking.transferLock),
        toLockEntry('Update Lock', 'update', locking.updateLock),
        toLockEntry('Delete Lock', 'delete', locking.deleteLock),
    ];
}

function toLockEntry(title: string, operation: string, lock: TimeLock): LockEntry {
    switch (lock.type) {
        case 'None':
            return {
                title,
                kind: 'unlocked',
                typeLabel: 'None',
                tooltip: `The ${operation} operation is not locked and can be performed at any time.`,
            };
        case 'UntilDestroyed':
            return {
                title,
                kind: 'permanent',
                typeLabel: 'UntilDestroyed',
                tooltip: `The ${operation} operation is permanently locked and cannot be performed.`,
            };
        case 'UnlockAt': {
            const unlockAtMs = Number(lock.args) * MILLISECONDS_PER_SECOND;
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
