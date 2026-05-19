// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { KeyValueInfo, TooltipPosition } from '@iota/apps-ui-kit';
import { type TimeLock, TimeLockType } from '@iota/audit-trail';
import { formatDate } from '@iota/core';

import { BaseLockCard } from './BaseLockCard';
import { parseTimeLockState } from './helper';
import { useCountdownFormatted } from '../../hooks/useCountdown';

interface TimeLockCardProps {
    lock: TimeLock;
    operationLabel: string;
}

/**
 * Specialized component for TimeLock rendering.
 */
export function TimeLockCard({ lock, operationLabel }: TimeLockCardProps) {
    const uiState = parseTimeLockState(lock, operationLabel);

    return (
        <BaseLockCard title={`${operationLabel} Lock`} uiState={uiState}>
            <KeyValueInfo
                keyText="Lock Type"
                value={uiState.typeLabel}
                fullwidth
                tooltipPosition={TooltipPosition.Left}
                tooltipText={uiState.tooltip}
            />
            <TimeLockExpirationDetails lock={lock} />
        </BaseLockCard>
    );
}

function TimeLockExpirationDetails({ lock }: { lock: TimeLock }) {
    if (lock.type !== TimeLockType.UnlockAt && lock.type !== TimeLockType.UnlockAtMs) {
        return null;
    }

    const unlockMs =
        lock.type === TimeLockType.UnlockAt ? Number(lock.args) * 1000 : Number(lock.args);
    const unlockDate = new Date(unlockMs);
    const formattedDate = formatDate(unlockDate, ['year', 'month', 'day', 'hour', 'minute']);
    const countdown = useCountdownFormatted(unlockDate);

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
