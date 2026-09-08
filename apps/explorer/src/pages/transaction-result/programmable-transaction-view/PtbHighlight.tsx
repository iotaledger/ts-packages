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

const HIGHLIGHT_CLASSES =
    'rounded transition-colors bg-iota-primary-90/60 dark:bg-iota-primary-70/10';

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
                isHighlighted && HIGHLIGHT_CLASSES,
                className,
            )}
        >
            {children}
        </Tag>
    );
}
