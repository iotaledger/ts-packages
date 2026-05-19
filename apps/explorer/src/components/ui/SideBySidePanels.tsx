// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ErrorBoundary } from '~/components';
import { clsx } from 'clsx';

/**
 * The props for the SideBySidePanels component.
 */
interface SideBySidePanelsProps {
    /**
     * The component for the first panel.
     */
    firstPanel: React.ReactNode;
    /**
     * The component for the second panel.
     */
    secondPanel: React.ReactNode;
    /**
     * The desired width distribution between panels on md+ screens.
     */
    ratio?: '50-50' | '66-34';
}

const RATIO_CLASSES = {
    '50-50': { first: 'md:w-1/2', second: 'md:w-1/2' },
    '66-34': { first: 'md:w-4/6', second: 'md:w-2/6' },
};

/**
 * Component that displays two panels side by side, already wrapped in ErrorBoundary.
 */
export function SideBySidePanels({
    firstPanel,
    secondPanel,
    ratio = '50-50',
}: SideBySidePanelsProps) {
    const classes = RATIO_CLASSES[ratio];

    return (
        <ErrorBoundary>
            <div className="flex flex-col gap-md md:flex-row">
                <div className={clsx('flex w-full flex-1', classes.first)}>
                    <div className="panel-bg flex w-full flex-col rounded-xl border border-transparent p-md--rs">
                        <ErrorBoundary>{firstPanel}</ErrorBoundary>
                    </div>
                </div>
                <div className={clsx('flex w-full', classes.second)}>
                    <div className="panel-bg flex w-full flex-col rounded-xl border border-transparent p-md--rs">
                        <ErrorBoundary>{secondPanel}</ErrorBoundary>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
