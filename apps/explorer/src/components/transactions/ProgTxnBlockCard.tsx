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
                <div className="mx-auto grid w-full grid-cols-1 items-start gap-xxs p-md--rs pt-xs--rs md:grid-cols-2 md:gap-xs lg:grid-cols-3 lg:gap-sm [&>div[data-state=open]>div]:h-full [&>div[data-state=open]]:self-stretch">
                    {noExpandableList ? <>{items}</> : <ExpandableListItems />}
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
