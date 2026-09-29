// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Panel, Title, TooltipPosition } from '@iota/apps-ui-kit';
import type { PropsWithChildren } from 'react';
import { ErrorBoundary } from '../error-boundary';

interface PagePanelProps {
    title: string;
    tooltip?: string;
}

export function PagePanel({ children, title, tooltip }: PropsWithChildren<PagePanelProps>) {
    return (
        <Panel>
            <div className="flex w-full items-center py-sm--rs">
                <Title title={title} tooltipPosition={TooltipPosition.Top} tooltipText={tooltip} />
            </div>

            <ErrorBoundary>
                <div className="flex flex-col gap-2xl px-md--rs py-md md:py-sm">{children}</div>
            </ErrorBoundary>
        </Panel>
    );
}
