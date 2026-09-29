// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useRef, useState, useLayoutEffect } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
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
    const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

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

    const computePosition = (rect: DOMRect) =>
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
        })[position];

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

        const pos = computePosition(rect);
        tooltipEl.style.transform = pos.transform;

        const { width, height } = tooltipEl.getBoundingClientRect();
        const margin = 8;

        const boxLeft = pos.left - width * pos.anchorX;
        const boxTop = pos.top - height * pos.anchorY;

        const deltaX = clampDelta(boxLeft, width, window.innerWidth, margin);
        const deltaY = clampDelta(boxTop, height, window.innerHeight, margin);

        setCoords({ top: pos.top + deltaY, left: pos.left + deltaX });
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
                        className={cx(base, maxWidth)}
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
