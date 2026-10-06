// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ButtonUnstyled } from '@iota/apps-ui-kit';
import { useState } from 'react';
import { TableCoinDisplay } from './TableCoinDisplay';

const MAX_VISIBLE_CHANGES = 5;

interface TableCoinChangesProps {
    changes: { coinType: string; amount: bigint | string }[];
}

export function TableCoinChanges({ changes }: TableCoinChangesProps) {
    const [showAll, setShowAll] = useState(false);
    const visibleChanges = showAll ? changes : changes.slice(0, MAX_VISIBLE_CHANGES);

    return (
        <div className="flex flex-col items-start gap-y-xxs py-xs">
            {visibleChanges.map(({ amount, coinType }) => (
                <TableCoinDisplay
                    key={coinType}
                    amount={amount}
                    coinType={coinType}
                    showSign
                    showTrustedBadge
                />
            ))}
            {changes.length > MAX_VISIBLE_CHANGES && (
                <ButtonUnstyled
                    className="text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? 'Show Less' : 'Show More'}
                </ButtonUnstyled>
            )}
        </div>
    );
}
