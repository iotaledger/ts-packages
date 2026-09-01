// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode } from 'react';
import {
    CollapsibleCard,
    ExpandableList,
    ExpandableListControl,
    ExpandableListItems,
} from '~/components/ui';
import { useBreakpoint } from '~/hooks';

interface ProgrammableTxnBlockCardProps {
    items: ReactNode[];
    itemsLabel: string;
    noExpandableList?: boolean;
    rawData?: unknown;
}

function renderResponsiveRows(items: ReactNode[], columns: number): JSX.Element {
    const rows = Array.from({ length: Math.ceil(items.length / columns) }, (_, index) =>
        items.slice(index * columns, (index + 1) * columns),
    );

    return (
        <>
            {rows.map((rowItems, index) => (
                <div
                    key={index}
                    className="grid grid-cols-1 items-stretch gap-xxs md:grid-cols-2 md:gap-xs lg:grid-cols-3 lg:gap-sm [&:has(>div[data-state=open])>div[data-state=open]]:self-stretch [&:has(>div[data-state=open])]:items-start [&>div>div]:h-full [&>div[data-state=closed]>div>div[role=button]]:h-full"
                >
                    {rowItems}
                </div>
            ))}
        </>
    );
}

export function ProgrammableTxnBlockCard({
    items,
    itemsLabel,
    noExpandableList,
    rawData,
}: ProgrammableTxnBlockCardProps): JSX.Element | null {
    const isMediumOrAbove = useBreakpoint('md');
    const isLarge = useBreakpoint('lg');

    if (!items?.length) {
        return null;
    }

    const columns = isLarge ? 3 : isMediumOrAbove ? 2 : 1;
    const maxRows = isLarge ? 2 : 3;
    const itemsToShow = Math.min(items.length, columns * maxRows);

    return (
        <CollapsibleCard title={itemsLabel} rawData={rawData}>
            <ExpandableList items={items} defaultItemsToShow={itemsToShow} itemsLabel={itemsLabel}>
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-xxs p-md--rs pt-xs--rs md:gap-xs lg:gap-sm">
                    {noExpandableList ? (
                        renderResponsiveRows(items, columns)
                    ) : (
                        <ExpandableListItems
                            renderItems={(visibleItems) =>
                                renderResponsiveRows(visibleItems, columns)
                            }
                        />
                    )}
                </div>

                {items.length > itemsToShow && (
                    <div className="pb-md">
                        <ExpandableListControl />
                    </div>
                )}
            </ExpandableList>
        </CollapsibleCard>
    );
}
