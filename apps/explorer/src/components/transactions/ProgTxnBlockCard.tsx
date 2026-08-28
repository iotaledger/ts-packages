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

interface ProgrammableTxnBlockCardProps {
    items: ReactNode[];
    itemsLabel: string;
    defaultItemsToShow?: number;
    noExpandableList?: boolean;
    rawData?: unknown;
}

export function ProgrammableTxnBlockCard({
    items,
    itemsLabel,
    noExpandableList,
    defaultItemsToShow,
    rawData,
}: ProgrammableTxnBlockCardProps): JSX.Element | null {
    if (!items?.length) {
        return null;
    }

    const itemsToShow = defaultItemsToShow || items.length;

    return (
        <CollapsibleCard title={itemsLabel} rawData={rawData}>
            <ExpandableList items={items} defaultItemsToShow={itemsToShow} itemsLabel={itemsLabel}>
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-y-xxs p-md--rs pt-xs--rs">
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
