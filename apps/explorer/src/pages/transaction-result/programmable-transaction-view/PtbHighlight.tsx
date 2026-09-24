// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    createContext,
    useContext,
    useMemo,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import clsx from 'clsx';
import { Badge, BadgeSize, type BadgeType } from '@iota/apps-ui-kit';

export type PtbRefId = `input-${number}` | `command-${number}`;

interface PtbHighlightContextValue {
    hoveredRef: PtbRefId | null;
    setHoveredRef: Dispatch<SetStateAction<PtbRefId | null>>;
}

const PtbHighlightContext = createContext<PtbHighlightContextValue | null>(null);

export function PtbHighlightProvider({ children }: { children: ReactNode }): JSX.Element {
    const [hoveredRef, setHoveredRef] = useState<PtbRefId | null>(null);
    const value = useMemo(() => ({ hoveredRef, setHoveredRef }), [hoveredRef]);

    return <PtbHighlightContext.Provider value={value}>{children}</PtbHighlightContext.Provider>;
}

export function usePtbHighlight(refId: PtbRefId | null): {
    isHighlighted: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
} {
    const context = useContext(PtbHighlightContext);

    if (!refId) {
        return { isHighlighted: false, onMouseEnter: () => {}, onMouseLeave: () => {} };
    }

    return {
        isHighlighted: context?.hoveredRef === refId,
        onMouseEnter: () => context?.setHoveredRef(refId),
        onMouseLeave: () =>
            context?.setHoveredRef((current) => (current === refId ? null : current)),
    };
}

const HIGHLIGHT_BOX_CLASSES =
    "relative inline-flex items-start rounded border border-transparent px-xxs -mx-xxs py-[2px] -my-[2px] transition-colors after:pointer-events-none after:absolute after:inset-0 after:rounded after:content-['']";
const HIGHLIGHT_BG_CLASSES =
    'border-iota-primary-70/60 after:bg-iota-primary-90/30 dark:border-iota-primary-70/60 dark:after:bg-iota-primary-70/30';

export function PtbIndexCell({
    refId,
    children,
    onHoverChange,
}: {
    refId: PtbRefId;
    children: ReactNode;
    onHoverChange?: (hovered: boolean) => void;
}): JSX.Element {
    const { onMouseEnter, onMouseLeave } = usePtbHighlight(refId);
    const [isSelfHovered, setIsSelfHovered] = useState(false);

    return (
        <span
            onMouseEnter={() => {
                setIsSelfHovered(true);
                onHoverChange?.(true);
                onMouseEnter();
            }}
            onMouseLeave={() => {
                setIsSelfHovered(false);
                onHoverChange?.(false);
                onMouseLeave();
            }}
            className={clsx(
                'cursor-pointer select-none text-label-sm',
                HIGHLIGHT_BOX_CLASSES,
                isSelfHovered
                    ? clsx(HIGHLIGHT_BG_CLASSES, 'text-iota-primary-30 dark:text-iota-primary-80')
                    : 'text-iota-neutral-60 dark:text-iota-neutral-40',
            )}
        >
            {children}
        </span>
    );
}

export function HighlightableRef({
    refId,
    children,
    as = 'span',
    className,
}: {
    refId: PtbRefId | null | undefined;
    children: ReactNode;
    as?: 'span' | 'div';
    className?: string;
}): JSX.Element {
    const { isHighlighted, onMouseEnter, onMouseLeave } = usePtbHighlight(refId ?? null);
    const Tag = as;

    if (!refId) {
        return <Tag className={className}>{children}</Tag>;
    }

    return (
        <Tag
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={clsx(
                'cursor-pointer select-none',
                HIGHLIGHT_BOX_CLASSES,
                isHighlighted && HIGHLIGHT_BG_CLASSES,
                className,
            )}
        >
            {children}
        </Tag>
    );
}

const BADGE_HIGHLIGHT_CLASSES =
    "relative inline-flex cursor-pointer select-none rounded-full after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:border-transparent after:transition-colors after:content-['']";
const BADGE_HIGHLIGHT_BG_CLASSES =
    'after:border-iota-primary-70/60 after:bg-iota-primary-90/30 dark:after:border-iota-primary-70/60 dark:after:bg-iota-primary-70/30';

export function HighlightableBadge({
    refId,
    label,
    type,
}: {
    refId: PtbRefId;
    label: string;
    type: BadgeType;
}): JSX.Element {
    const { isHighlighted, onMouseEnter, onMouseLeave } = usePtbHighlight(refId);

    return (
        <span
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={clsx(BADGE_HIGHLIGHT_CLASSES, isHighlighted && BADGE_HIGHLIGHT_BG_CLASSES)}
        >
            <Badge type={type} label={label} size={BadgeSize.Small} />
        </span>
    );
}
