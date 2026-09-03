// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { PropsWithChildren } from 'react';
import cx from 'classnames';
import { ArrowDown } from '@iota/apps-ui-icons';
import { Button, ButtonType } from '@/components/atoms';
import { ICON_STYLE } from './accordion.classes';

export interface AccordionHeaderProps {
    /**
     * Flag for show/hide content
     */
    isExpanded: boolean;

    /**
     * Action on toggle show/hide content
     */
    onToggle: () => void;

    /**
     * The type of the badge.
     */
    badge?: React.ReactNode;
    /**
     * Flag for hiding arrow.
     */
    hideArrow?: boolean;
    /**
     * Flag for hiding border.
     */
    hideBorder?: boolean;

    /**
     * Disable the header state layer while an interactive child is active.
     * This keeps the parent hover treatment from competing with child links
     * and controls.
     */
    disableStateLayer?: boolean;
}

interface AccordionContentProps {
    /**
     * Flag for show/hide content
     */
    isExpanded: boolean;
}

export function AccordionHeader({
    onToggle,
    children,
    isExpanded,
    hideArrow,
    disableStateLayer = false,
}: PropsWithChildren<AccordionHeaderProps>) {
    return (
        <div
            onClick={onToggle}
            role="button"
            aria-expanded={isExpanded}
            className={cx(
                'relative flex cursor-pointer items-center justify-between gap-md overflow-hidden rounded-xl py-sm--rs',
                !disableStateLayer && 'state-layer',
                {
                    'pr-md--rs': !hideArrow,
                },
            )}
        >
            {children}
            {!hideArrow && (
                <div className="[&_svg]:h-5 [&_svg]:w-5">
                    <Button
                        type={ButtonType.Ghost}
                        icon={
                            <ArrowDown
                                className={cx(ICON_STYLE, {
                                    'rotate-180': isExpanded,
                                })}
                            />
                        }
                    />
                </div>
            )}
        </div>
    );
}

export function AccordionContent({
    isExpanded,
    children,
}: PropsWithChildren<AccordionContentProps>) {
    return (
        <div
            className={cx({
                hidden: !isExpanded,
            })}
        >
            {children}
        </div>
    );
}

export function Accordion({
    children,
    hideBorder,
}: {
    children: React.ReactNode;
    hideBorder?: boolean;
}): React.JSX.Element {
    return (
        <div
            className={cx('accordion-bg rounded-xl', {
                'accordion-border-color border': !hideBorder,
            })}
        >
            {children}
        </div>
    );
}
