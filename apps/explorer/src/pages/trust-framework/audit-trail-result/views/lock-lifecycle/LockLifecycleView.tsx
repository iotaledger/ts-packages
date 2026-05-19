// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Info } from '@iota/apps-ui-icons';
import { InfoBox, InfoBoxStyle, InfoBoxType, Title, TooltipPosition } from '@iota/apps-ui-kit';
import { type LockingConfig } from '@iota/audit-trail';

import { ErrorBoundary } from '~/components';

import { LockingWindowCard } from './LockingWindowCard';
import { TimeLockCard } from './TimeLockCard';

interface LockLifecycleViewProps {
    lockingConfig: LockingConfig | undefined;
}

/**
 * Main view for audit trail lock lifecycle.
 * Orchestrates atomic lock cards based on the provided configuration.
 */
export function LockLifecycleView({ lockingConfig }: LockLifecycleViewProps): JSX.Element {
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
                    <TimeLockCard lock={lockingConfig.writeLock} operationLabel="Write" />
                    <TimeLockCard
                        lock={lockingConfig.deleteTrailLock}
                        operationLabel="Delete Trail"
                    />
                    <LockingWindowCard
                        lock={lockingConfig.deleteRecordWindow}
                        operationLabel="Delete Record"
                    />
                </div>
            </div>
        </ErrorBoundary>
    );
}
