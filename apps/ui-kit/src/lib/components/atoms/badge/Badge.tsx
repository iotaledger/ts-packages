// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import cx from 'classnames';
import type { ReactNode } from 'react';
import { BadgeSize, BadgeType } from './badge.enums';
import { BACKGROUND_COLORS, BORDER_COLORS, TEXT_COLORS } from './badge.classes';

interface BadgeProps {
    /**
     * The type of the badge.
     */
    type: BadgeType;
    /**
     * The label of the badge.
     */
    label?: string;
    /**
     * The size of the badge
     */
    size?: BadgeSize;
    /**
     * An icon rendered before the label.
     */
    icon?: ReactNode;
}

export function Badge({
    type,
    label,
    size = BadgeSize.Medium,
    icon,
}: BadgeProps): React.JSX.Element {
    const backgroundClasses = BACKGROUND_COLORS[type];
    const textClasses = TEXT_COLORS[type];
    const isSmall = size === BadgeSize.Small;
    const isOutlined = type === BadgeType.Outlined;
    const labelClasses = label ? 'px-xs py-xxs' : 'h-1.5 w-1.5';
    const textSizeClass = isSmall ? 'text-label-sm' : 'text-label-md';

    return (
        <div
            className={cx(
                'inline-flex items-center rounded-full disabled:opacity-30',
                icon ? 'gap-xxs' : 'space-x-2',
                { border: !isSmall },
                { [BORDER_COLORS[type]]: !isSmall },
                { 'badge-ring-outlined': isSmall && isOutlined },
                backgroundClasses,
                labelClasses,
            )}
        >
            {icon && (
                <span className={cx('flex h-4 w-4 items-center justify-center', textClasses)}>
                    {icon}
                </span>
            )}
            <span className={cx(textSizeClass, textClasses)}>{label}</span>
        </div>
    );
}
