// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode, useState } from 'react';
import { ButtonUnstyled } from '@iota/apps-ui-kit';
import { Copy } from '@iota/apps-ui-icons';
import clsx from 'clsx';
import { usePtbHighlight, type PtbRefId } from './PtbHighlight';

export function StackedField({
    keyText,
    value,
}: {
    keyText: string;
    value: ReactNode;
}): JSX.Element {
    return (
        <div className="flex flex-col gap-xxs py-xs">
            <span className="key-value-key-text-color text-body-md">{keyText}</span>
            <span className="key-value-hover-text-color break-all text-body-md">{value}</span>
        </div>
    );
}

const VISIBLE_ARGUMENT_ROWS = 3;

export interface ArgumentRow {
    node: ReactNode;
    refId?: PtbRefId;
}

function ArgumentRowContainer({ index, row }: { index: number; row: ArgumentRow }): JSX.Element {
    const { isHighlighted, onMouseEnter, onMouseLeave } = usePtbHighlight(row.refId ?? null);

    return (
        <div
            onMouseEnter={row.refId ? onMouseEnter : undefined}
            onMouseLeave={row.refId ? onMouseLeave : undefined}
            className={clsx(
                'grid grid-cols-[20px_minmax(0,1fr)] items-center gap-xs rounded-lg px-sm py-xs transition-colors',
                row.refId && 'cursor-pointer select-none',
                isHighlighted
                    ? 'bg-iota-primary-90/60 dark:bg-iota-primary-70/10'
                    : 'bg-iota-neutral-98 dark:bg-iota-neutral-10',
            )}
        >
            <span className="text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                {index}
            </span>
            <div className="min-w-0">{row.node}</div>
        </div>
    );
}

export function ArgumentsBlock({
    label,
    rows,
}: {
    label: string;
    rows: ArgumentRow[];
}): JSX.Element | null {
    const [showAll, setShowAll] = useState(false);

    if (rows.length === 0) {
        return null;
    }

    const visibleRows = showAll ? rows : rows.slice(0, VISIBLE_ARGUMENT_ROWS);
    const hiddenCount = rows.length - VISIBLE_ARGUMENT_ROWS;

    return (
        <div className="flex flex-col gap-xs py-xs">
            <div className="flex items-center gap-xs">
                <span className="key-value-key-text-color text-body-md">{label}</span>
                <span className="rounded-full bg-iota-neutral-92 px-xs text-label-sm text-iota-neutral-40 dark:bg-iota-neutral-12 dark:text-iota-neutral-60">
                    {rows.length}
                </span>
            </div>
            <div className="flex flex-col gap-xxs">
                {visibleRows.map((row, index) => (
                    <ArgumentRowContainer key={index} index={index} row={row} />
                ))}
            </div>
            {hiddenCount > 0 && (
                <ButtonUnstyled
                    onClick={() => setShowAll((show) => !show)}
                    className="self-center text-label-sm text-iota-primary-30 dark:text-iota-primary-80"
                >
                    {showAll ? 'Show less' : `Show ${hiddenCount} more`}
                </ButtonUnstyled>
            )}
        </div>
    );
}

export function CopyButton({
    text,
    onCopySuccess,
}: {
    text: string;
    onCopySuccess?: (event: React.MouseEvent<HTMLButtonElement>, text: string) => void;
}): JSX.Element {
    async function handleCopyClick(event: React.MouseEvent<HTMLButtonElement>) {
        if (!navigator.clipboard) {
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            onCopySuccess?.(event, text);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }

    return (
        <ButtonUnstyled
            onClick={handleCopyClick}
            aria-label="Copy to clipboard"
            className="shrink-0"
        >
            <Copy className="key-supporting-text-color" />
        </ButtonUnstyled>
    );
}
