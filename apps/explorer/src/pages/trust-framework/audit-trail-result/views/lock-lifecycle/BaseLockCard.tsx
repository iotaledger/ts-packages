// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { TitleSize } from '@iota/apps-ui-kit';
import { type ReactNode } from 'react';

import { CollapsibleCard, IconBadge } from '~/components';

import { type LockUIState } from './helper';

interface BaseLockCardProps {
    title: string;
    uiState: LockUIState;
    children: ReactNode;
}

/**
 * Base atomic component for lock cards.
 * Handles the visual layout, collapse logic, and badge rendering.
 */
export function BaseLockCard({ title, uiState, children }: BaseLockCardProps) {
    return (
        <CollapsibleCard
            collapsible
            title={title}
            titleSize={TitleSize.Small}
            supportingTitleElement={
                <div className="ml-1 flex">
                    <IconBadge
                        label={uiState.badgeLabel}
                        type={uiState.badgeType}
                        icon={uiState.icon}
                    />
                </div>
            }
        >
            <div className="flex flex-col gap-4 px-md--rs py-sm--rs">{children}</div>
        </CollapsibleCard>
    );
}
