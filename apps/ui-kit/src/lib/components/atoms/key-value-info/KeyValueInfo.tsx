// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react';
import cx from 'classnames';
import { Copy, Info } from '@iota/apps-ui-icons';
import { KeyColumnWidth, ValueSize } from './keyValue.enums';
import type { TooltipPosition } from '../tooltip';
import { Tooltip } from '../tooltip';
import { ButtonUnstyled } from '../button';

interface KeyValueProps {
    /**
     * The key of the KeyValue.
     */
    keyText: string;
    /**
     * An icon shown next to the key text (optional).
     */
    keyIcon?: ReactNode;
    /**
     * The value of the KeyValue.
     */
    value: ReactNode;
    /**
     * The tooltip position.
     */
    tooltipPosition?: TooltipPosition;
    /**
     * The tooltip text.
     */
    tooltipText?: ReactNode;
    /**
     * The supporting label of the KeyValue (optional).
     */
    supportingLabel?: string | ReactNode;
    /**
     * The size of the value (optional).
     */
    size?: ValueSize;
    /**
     * The flag to truncate the value text.
     */
    isTruncated?: boolean;
    /**
     * Text that need to be copied (optional).
     */
    copyText?: string;
    /**
     * The onCopySuccess event of the KeyValue  (optional).
     */
    onCopySuccess?: (e: React.MouseEvent<HTMLButtonElement>, text: string) => void;
    /**
     * The onCopyError event of the KeyValue  (optional).
     */
    onCopyError?: (e: unknown, text: string) => void;
    /**
     * Full width KeyValue (optional).
     */
    fullwidth?: boolean;
    /**
     * Reverse the KeyValue (optional).
     */
    isReverse?: boolean;
    /**
     * Text shown on value hover.
     */
    valueHoverTitle?: string;
    /**
     * The width of the key column, relative to the value column (optional).
     */
    keyColumnWidth?: KeyColumnWidth;
}

export function KeyValueInfo({
    keyText,
    keyIcon,
    value,
    tooltipPosition,
    tooltipText,
    supportingLabel,
    size = ValueSize.Small,
    isTruncated = false,
    copyText,
    onCopySuccess,
    onCopyError,
    fullwidth,
    isReverse = false,
    valueHoverTitle,
    keyColumnWidth = KeyColumnWidth.Default,
}: KeyValueProps): React.JSX.Element {
    const flexDirectionClass = isReverse ? 'flex-row-reverse' : 'flex-row';
    async function handleCopyClick(event: React.MouseEvent<HTMLButtonElement>) {
        if (!navigator.clipboard) {
            return;
        }

        if (copyText) {
            try {
                await navigator.clipboard.writeText(copyText);
                onCopySuccess?.(event, copyText);
            } catch (error) {
                console.error('Failed to copy:', error);
                onCopyError?.(error, copyText);
            }
        }
    }

    return (
        <div
            className={cx(
                'flex w-full items-baseline gap-sm py-xxs font-inter',
                flexDirectionClass,
                {
                    'flex-wrap justify-between': fullwidth,
                },
            )}
        >
            <div
                className={cx('flex shrink-0 flex-row items-center gap-x-0.5', {
                    'w-1/4': !fullwidth && keyColumnWidth === KeyColumnWidth.Default,
                    'w-2/5': !fullwidth && keyColumnWidth === KeyColumnWidth.Wide,
                })}
            >
                {keyIcon}
                <span className="key-value-key-text-color min-w-0 break-words text-body-md">
                    {keyText}
                </span>
                {tooltipText && (
                    <Tooltip text={tooltipText} position={tooltipPosition}>
                        <Info className="key-supporting-text-color" />
                    </Tooltip>
                )}
            </div>
            <div
                className={cx('flex min-w-0 flex-row items-baseline gap-1 break-all', {
                    'w-3/4': !fullwidth && keyColumnWidth === KeyColumnWidth.Default,
                    'w-3/5': !fullwidth && keyColumnWidth === KeyColumnWidth.Wide,
                    'flex-wrap': fullwidth,
                    truncate: isTruncated,
                })}
            >
                <span
                    title={valueHoverTitle}
                    className={cx(
                        'key-value-hover-text-color min-w-0',
                        size === ValueSize.Medium ? 'text-body-lg' : 'text-body-md',
                        { truncate: isTruncated },
                    )}
                >
                    {value}
                </span>
                {supportingLabel && (
                    <span
                        className={cx(
                            'key-supporting-text-color',
                            size === ValueSize.Medium ? 'text-body-md' : 'text-body-sm',
                        )}
                    >
                        {supportingLabel}
                    </span>
                )}
                <div className="self-center">
                    {copyText && (
                        <ButtonUnstyled onClick={handleCopyClick} aria-label="Copy to clipboard">
                            <Copy className="key-supporting-text-color" />
                        </ButtonUnstyled>
                    )}
                </div>
            </div>
        </div>
    );
}
