// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { KeyValueInfo, TooltipPosition } from '@iota/apps-ui-kit';
import { type LockingWindow, LockingWindowType } from '@iota/audit-trail';

import { BaseLockCard } from './BaseLockCard';
import { parseLockingWindowState } from './helper';

interface LockingWindowCardProps {
    lock: LockingWindow;
    operationLabel: string;
}

/**
 * Specialized component for LockingWindow rendering.
 */
export function LockingWindowCard({ lock, operationLabel }: LockingWindowCardProps) {
    const uiState = parseLockingWindowState(lock, operationLabel);

    return (
        <BaseLockCard title={`${operationLabel} Lock`} uiState={uiState}>
            <KeyValueInfo
                keyText="Lock Type"
                value={uiState.typeLabel}
                fullwidth
                tooltipPosition={TooltipPosition.Left}
                tooltipText={uiState.tooltip}
            />
            <LockingWindowPolicyDetails lock={lock} />
        </BaseLockCard>
    );
}

function LockingWindowPolicyDetails({ lock }: { lock: LockingWindow }) {
    if (lock.type === LockingWindowType.TimeBased) {
        return (
            <KeyValueInfo
                keyText="Policy Rule"
                value={`Records created within last ${Number(lock.args)} seconds are locked`}
                fullwidth
            />
        );
    }

    if (lock.type === LockingWindowType.CountBased) {
        return (
            <KeyValueInfo
                keyText="Policy Rule"
                value={`Newest ${Number(lock.args)} records are locked`}
                fullwidth
            />
        );
    }

    return null;
}
