// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useRef, useState, useLayoutEffect } from 'react';
import type { MouseEvent, PropsWithChildren, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import cx from 'classnames';
import { TooltipPosition } from './tooltip.enums';

interface TooltipProps {
    text: ReactNode;
    position?: TooltipPosition;
    maxWidth?: string;
    offset?: number;
    openDelay?: number;
    closeDelay?: number;
}

const OPPOSITE_POSITION: Record<TooltipPosition, TooltipPosition> = {
    [TooltipPosition.Top]: TooltipPosition.Bottom,
    [TooltipPosition.Bottom]: TooltipPosition.Top,
    [TooltipPosition.Left]: TooltipPosition.Right,
    [TooltipPosition.Right]: TooltipPosition.Left,
};

export function Tooltip({
    text,
    position = TooltipPosition.Top,
    maxWidth = 'max-w-[200px]',
    offset = 8,
    openDelay = 0,
    closeDelay = 100,
    children,
}: PropsWithChildren<TooltipProps>) {
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, overlapsTrigger: false });

    const openTimer = useRef<ReturnType<typeof setTimeout>>();
    const closeTimer = useRef<ReturnType<typeof setTimeout>>();

    const clearTimers = () => {
        clearTimeout(openTimer.current);
        clearTimeout(closeTimer.current);
    };

    const open = () => {
        clearTimers();
        openTimer.current = setTimeout(() => setVisible(true), openDelay);
    };

    const close = () => {
        clearTimers();
        closeTimer.current = setTimeout(() => setVisible(false), closeDelay);
    };

    const computePosition = (rect: DOMRect, placement: TooltipPosition) =>
        ({
            [TooltipPosition.Top]: {
                top: rect.top - offset,
                left: rect.left + rect.width / 2,
                transform: 'translate(-50%, -100%)',
                anchorX: 0.5,
                anchorY: 1,
            },
            [TooltipPosition.Bottom]: {
                top: rect.bottom + offset,
                left: rect.left + rect.width / 2,
                transform: 'translate(-50%, 0)',
                anchorX: 0.5,
                anchorY: 0,
            },
            [TooltipPosition.Left]: {
                top: rect.top + rect.height / 2,
                left: rect.left - offset,
                transform: 'translate(-100%, -50%)',
                anchorX: 1,
                anchorY: 0.5,
            },
            [TooltipPosition.Right]: {
                top: rect.top + rect.height / 2,
                left: rect.right + offset,
                transform: 'translate(0, -50%)',
                anchorX: 0,
                anchorY: 0.5,
            },
        })[placement];

    const clampDelta = (boxStart: number, size: number, viewportSize: number, margin: number) => {
        const boxEnd = boxStart + size;
        if (boxEnd > viewportSize - margin) return viewportSize - margin - boxEnd;
        if (boxStart < margin) return margin - boxStart;
        return 0;
    };

    useLayoutEffect(() => {
        if (!visible) return;

        const rect = triggerRef.current?.getBoundingClientRect();
        const tooltipEl = tooltipRef.current;
        if (!rect || !tooltipEl) return;

        const { width, height } = tooltipEl.getBoundingClientRect();
        const margin = 8;
        const isVertical = position === TooltipPosition.Top || position === TooltipPosition.Bottom;

        const fitsMainAxis = (pos: ReturnType<typeof computePosition>) =>
            isVertical
                ? clampDelta(pos.top - height * pos.anchorY, height, window.innerHeight, margin) ===
                  0
                : clampDelta(pos.left - width * pos.anchorX, width, window.innerWidth, margin) ===
                  0;

        let pos = computePosition(rect, position);
        if (!fitsMainAxis(pos)) {
            const flipped = computePosition(rect, OPPOSITE_POSITION[position]);
            if (fitsMainAxis(flipped)) pos = flipped;
        }
        tooltipEl.style.transform = pos.transform;

        const boxLeft = pos.left - width * pos.anchorX;
        const boxTop = pos.top - height * pos.anchorY;

        const deltaX = clampDelta(boxLeft, width, window.innerWidth, margin);
        const deltaY = clampDelta(boxTop, height, window.innerHeight, margin);

        const left = boxLeft + deltaX;
        const top = boxTop + deltaY;
        const overlapsTrigger =
            left < rect.right &&
            left + width > rect.left &&
            top < rect.bottom &&
            top + height > rect.top;

        setCoords({ top: pos.top + deltaY, left: pos.left + deltaX, overlapsTrigger });
    }, [visible, position, offset]);

    useLayoutEffect(() => {
        if (!visible) return;
        const dismiss = () => {
            clearTimers();
            setVisible(false);
        };
        window.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        return () => {
            window.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('resize', dismiss);
        };
    }, [visible]);

    // Keeps a link or button wrapping the trigger from acting on clicks meant to open the tooltip.
    const handleTriggerClick = (event: MouseEvent<HTMLDivElement>) => {
        const interactive = (event.target as Element).closest('a, button');
        if (!interactive || triggerRef.current?.contains(interactive)) return;
        event.preventDefault();
        event.stopPropagation();
        open();
    };

    // z-[9999999999]: needed because we must exceed the popup’s ≈2 147 483 647 z-index;
    // otherwise the tooltip renders but stays invisible inside a Chrome extension
    const base = 'z-[9999999999] w-max rounded p-xs tooltip-bg tooltip-text-color';

    return (
        <>
            <div
                ref={triggerRef}
                className="inline-block cursor-pointer"
                onMouseEnter={open}
                onFocus={open}
                onMouseLeave={close}
                onBlur={close}
                onClick={handleTriggerClick}
            >
                {children}
            </div>

            {visible &&
                createPortal(
                    <div
                        ref={tooltipRef}
                        role="tooltip"
                        style={{
                            position: 'fixed',
                            top: coords.top,
                            left: coords.left,
                            transition: 'opacity .15s ease',
                            opacity: 1,
                        }}
                        className={cx(
                            base,
                            maxWidth,
                            coords.overlapsTrigger && 'pointer-events-none',
                        )}
                        onMouseEnter={open}
                        onMouseLeave={close}
                    >
                        <p className="w-full break-words">{text}</p>
                    </div>,
                    document.body,
                )}
        </>
    );
}
