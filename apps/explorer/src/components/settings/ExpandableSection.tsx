// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode, useState } from 'react';
import cx from 'clsx';
import { TriangleDown } from '@iota/apps-ui-icons';

interface ExpandableSectionProps {
    title: string;
    children: ReactNode;
    defaultExpanded?: boolean;
}

export function ExpandableSection({
    title,
    children,
    defaultExpanded = false,
}: ExpandableSectionProps): JSX.Element {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="flex flex-col">
            <button
                type="button"
                onClick={() => setIsExpanded((expanded) => !expanded)}
                aria-expanded={isExpanded}
                className="state-layer relative flex items-center justify-between rounded-lg px-md py-sm text-title-md text-iota-neutral-10 dark:text-iota-neutral-92"
            >
                {title}
                <TriangleDown
                    className={cx('h-5 w-5 transition-transform', { 'rotate-180': isExpanded })}
                />
            </button>
            {isExpanded ? <div className="pl-sm">{children}</div> : null}
        </div>
    );
}
