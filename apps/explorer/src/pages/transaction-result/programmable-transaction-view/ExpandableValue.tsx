// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { ButtonUnstyled } from '@iota/apps-ui-kit';
import clsx from 'clsx';

const VALUE_PREVIEW_LENGTH = 160;

export function ExpandableValue({
    value,
    align = 'end',
}: {
    value: string;
    align?: 'start' | 'end';
}): JSX.Element {
    const [showFullValue, setShowFullValue] = useState(false);
    const isLongValue = value.length > VALUE_PREVIEW_LENGTH;
    const displayedValue =
        !isLongValue || showFullValue
            ? value
            : `${value.slice(0, VALUE_PREVIEW_LENGTH).trimEnd()}…`;

    if (!isLongValue) {
        return <>{value}</>;
    }

    return (
        <span
            className={clsx(
                'flex max-w-full flex-col gap-xxs',
                align === 'end' ? 'items-end text-right' : 'items-start text-left',
            )}
        >
            <span
                className={clsx(
                    'break-all',
                    showFullValue &&
                        'max-h-48 overflow-y-auto rounded-md border border-iota-neutral-92 bg-transparent p-xs text-left dark:border-iota-neutral-12',
                )}
            >
                {displayedValue}
            </span>
            <ButtonUnstyled
                className="shrink-0 text-label-sm text-iota-primary-30 dark:text-iota-primary-80"
                onClick={() => setShowFullValue((isExpanded) => !isExpanded)}
            >
                {showFullValue ? 'Show Less' : 'Show More'}
            </ButtonUnstyled>
        </span>
    );
}
