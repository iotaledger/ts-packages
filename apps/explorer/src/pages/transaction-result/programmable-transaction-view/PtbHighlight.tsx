// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import clsx from 'clsx';
import { Badge, BadgeSize, type BadgeType } from '@iota/apps-ui-kit';

type PtbRefId = `input-${number}` | `command-${number}`;

interface PtbHighlightState {
    hoveredRef: PtbRefId | null;
    selectedRef: PtbRefId | null;
    selectedVia: string | null;
    revealedRowsId: string | null;
}

const INITIAL_HIGHLIGHT_STATE: PtbHighlightState = {
    hoveredRef: null,
    selectedRef: null,
    selectedVia: null,
    revealedRowsId: null,
};

function createPtbHighlightStore() {
    let state = INITIAL_HIGHLIGHT_STATE;
    const listeners = new Set<() => void>();

    return {
        getState: () => state,
        setState: (partial: Partial<PtbHighlightState>) => {
            state = { ...state, ...partial };
            listeners.forEach((listener) => listener());
        },
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

type PtbHighlightStore = ReturnType<typeof createPtbHighlightStore>;

const PtbHighlightContext = createContext<PtbHighlightStore | null>(null);

export function PtbHighlightProvider({ children }: { children: ReactNode }): JSX.Element {
    const [store] = useState(createPtbHighlightStore);

    return <PtbHighlightContext.Provider value={store}>{children}</PtbHighlightContext.Provider>;
}

export function useResetPtbHighlight(): () => void {
    const store = useContext(PtbHighlightContext);
    return () => store?.setState(INITIAL_HIGHLIGHT_STATE);
}

const subscribeToNothing = () => () => {};

function usePtbHighlightState<T>(selector: (state: PtbHighlightState) => T, fallback: T): T {
    const store = useContext(PtbHighlightContext);

    return useSyncExternalStore(store?.subscribe ?? subscribeToNothing, () =>
        store ? selector(store.getState()) : fallback,
    );
}

export function usePtbRevealedRows(rowsId: string): {
    isRevealed: boolean;
    clearRevealed: () => void;
} {
    const store = useContext(PtbHighlightContext);
    const isRevealed = usePtbHighlightState((state) => state.revealedRowsId === rowsId, false);

    return { isRevealed, clearRevealed: () => store?.setState({ revealedRowsId: null }) };
}

function getClippingCollapsedRowsId(element: Element): string | null {
    const collapsedRows = element.closest<HTMLElement>('[data-collapsed-rows]');
    const isClipped =
        !!collapsedRows &&
        element.getBoundingClientRect().top >= collapsedRows.getBoundingClientRect().bottom;
    return isClipped ? (collapsedRows.dataset.collapsedRows ?? null) : null;
}

export function usePtbHighlight(refId: PtbRefId | null): {
    isHighlighted: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onClick: () => void;
    onIndexClick: () => void;
} {
    const store = useContext(PtbHighlightContext);
    const isHighlighted = usePtbHighlightState(
        (state) => !!refId && (state.hoveredRef === refId || state.selectedRef === refId),
        false,
    );

    if (!refId || !store) {
        return {
            isHighlighted,
            onMouseEnter: () => {},
            onMouseLeave: () => {},
            onClick: () => {},
            onIndexClick: () => {},
        };
    }

    const toggleSelectionAndScrollTo = (selector: string, block: ScrollLogicalPosition) => {
        const element = document.querySelector(selector);
        if (!element) {
            return;
        }
        const { selectedRef, selectedVia } = store.getState();
        if (selectedRef === refId && selectedVia === selector) {
            store.setState({ selectedRef: null, selectedVia: null, revealedRowsId: null });
            return;
        }
        flushSync(() =>
            store.setState({
                selectedRef: refId,
                selectedVia: selector,
                revealedRowsId: getClippingCollapsedRowsId(element),
            }),
        );
        element.scrollIntoView({ block, behavior: 'smooth' });
    };

    return {
        isHighlighted,
        onMouseEnter: () => store.setState({ hoveredRef: refId }),
        onMouseLeave: () => {
            if (store.getState().hoveredRef === refId) {
                store.setState({ hoveredRef: null });
            }
        },
        onClick: () => toggleSelectionAndScrollTo(`[data-ptb-target="${refId}"]`, 'center'),
        onIndexClick: () => toggleSelectionAndScrollTo(`[data-ptb-ref="${refId}"]`, 'nearest'),
    };
}

const HIGHLIGHT_BOX_CLASSES =
    "relative inline-flex items-start rounded border border-transparent px-xxs -mx-xxs py-[2px] -my-[2px] transition-colors duration-75 after:pointer-events-none after:absolute after:inset-0 after:rounded after:content-['']";
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
    const { onMouseEnter, onMouseLeave, onIndexClick } = usePtbHighlight(refId);
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
            onClick={onIndexClick}
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
    const { isHighlighted, onMouseEnter, onMouseLeave, onClick } = usePtbHighlight(refId ?? null);
    const Tag = as;

    if (!refId) {
        return <Tag className={className}>{children}</Tag>;
    }

    return (
        <Tag
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
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
    "relative inline-flex cursor-pointer select-none rounded-full after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:border-transparent after:transition-colors after:duration-75 after:content-['']";
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
    const { isHighlighted, onMouseEnter, onMouseLeave, onClick } = usePtbHighlight(refId);

    return (
        <span
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            data-ptb-ref={refId}
            className={clsx(BADGE_HIGHLIGHT_CLASSES, isHighlighted && BADGE_HIGHLIGHT_BG_CLASSES)}
        >
            <Badge type={type} label={label} size={BadgeSize.Small} />
        </span>
    );
}
