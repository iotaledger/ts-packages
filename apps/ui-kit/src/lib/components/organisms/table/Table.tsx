// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { PropsWithChildren, ReactNode } from 'react';
import cx from 'classnames';
import { TableProvider, useTableContext } from './TableContext';
import type { ButtonProps } from '@/components/atoms';
import { Button, ButtonSize, ButtonType, Checkbox } from '@/components/atoms';
import { TableCellBase, TableHeaderCell } from '@/components/molecules';
import { ArrowLeft, DoubleArrowLeft, ArrowRight, DoubleArrowRight } from '@iota/apps-ui-icons';
import { INTERACTIVE_ELEMENT_SELECTOR } from '@/lib/constants';

export interface TablePaginationOptions {
    /**
     * On Next page button click.
     */
    onNext?: () => void;
    /**
     * On Previous page button click.
     */
    onPrev?: () => void;
    /**
     * On First page button click.
     */
    onFirst?: () => void;
    /**
     * On Last page button click.
     */
    onLast?: () => void;
    /**
     * Has Next button.
     */
    hasNext?: boolean;
    /**
     * Has Previous button.
     */
    hasPrev?: boolean;
    /**
     * Has First button.
     */
    hasFirst?: boolean;
    /**
     * Has Last button.
     */
    hasLast?: boolean;
}

export type TableProps = {
    /**
     * Options for the table pagination.
     */
    paginationOptions?: TablePaginationOptions;
    /**
     * The action component.
     */
    action?: ReactNode;
    /**
     * The supporting label of the table.
     */
    supportingLabel?: string;
    /**
     * Numeric indexes of the selected rows.
     */
    selectedRowIndexes?: Set<number>;
    /**
     * Numeric indexes of all the rows.
     */
    rowIndexes: number[];
    /**
     * The page size selector component.
     */
    pageSizeSelector?: ReactNode;

    /**
     * If the table should take the full height of the parent.
     */
    heightFull?: boolean;
};

export function Table({
    paginationOptions,
    action,
    supportingLabel,
    selectedRowIndexes = new Set(),
    rowIndexes,
    children,
    pageSizeSelector,
    heightFull = false,
}: PropsWithChildren<TableProps>): JSX.Element {
    return (
        <TableProvider selectedRowIndexes={selectedRowIndexes} rowIndexes={rowIndexes}>
            <div className={cx('w-full', { 'h-full': heightFull })}>
                <div
                    className={cx('overflow-auto', {
                        'h-full': heightFull,
                    })}
                >
                    <table
                        className={cx('w-full table-auto', {
                            'h-full': heightFull,
                        })}
                    >
                        {children}
                    </table>
                </div>
                <div
                    className={cx('flex w-full items-center gap-sm pt-md', {
                        hidden: !supportingLabel && !paginationOptions && !action,
                        'flex-col justify-between sm:flex-row': paginationOptions,
                        'justify-end': !paginationOptions && action,
                    })}
                >
                    {(paginationOptions || action) && (
                        <div className="flex gap-2">
                            {paginationOptions && (
                                <>
                                    <Button
                                        type={ButtonType.Secondary}
                                        size={ButtonSize.Small}
                                        icon={<DoubleArrowLeft />}
                                        disabled={!paginationOptions.hasFirst}
                                        onClick={paginationOptions.onFirst}
                                        aria-label="First page"
                                    />
                                    <Button
                                        type={ButtonType.Secondary}
                                        size={ButtonSize.Small}
                                        icon={<ArrowLeft />}
                                        disabled={!paginationOptions.hasPrev}
                                        onClick={paginationOptions.onPrev}
                                        aria-label="Previous page"
                                    />
                                    <Button
                                        type={ButtonType.Secondary}
                                        size={ButtonSize.Small}
                                        icon={<ArrowRight />}
                                        disabled={!paginationOptions.hasNext}
                                        onClick={paginationOptions.onNext}
                                        aria-label="Next page"
                                    />
                                    <Button
                                        type={ButtonType.Secondary}
                                        size={ButtonSize.Small}
                                        icon={<DoubleArrowRight />}
                                        disabled={!paginationOptions.hasLast}
                                        onClick={paginationOptions.onLast}
                                        aria-label="Last page"
                                    />
                                </>
                            )}
                            {action}
                        </div>
                    )}
                    {supportingLabel || pageSizeSelector ? (
                        <div className="flex flex-row items-center gap-x-sm">
                            {supportingLabel && (
                                <span className="table-text-color text-label-md">
                                    {supportingLabel}
                                </span>
                            )}
                            {pageSizeSelector && <div className="ml-2">{pageSizeSelector}</div>}
                        </div>
                    ) : null}
                </div>
            </div>
        </TableProvider>
    );
}

export function TableActionButton(props: PropsWithChildren<ButtonProps>) {
    return <Button type={ButtonType.Secondary} size={ButtonSize.Small} {...props} />;
}

export function TableHeader({ children }: PropsWithChildren): JSX.Element {
    return <thead>{children}</thead>;
}

function isRowClickIgnored(event: React.MouseEvent<HTMLTableRowElement>): boolean {
    const interactiveElement =
        event.target instanceof Element && event.target.closest(INTERACTIVE_ELEMENT_SELECTOR);
    if (interactiveElement && event.currentTarget.contains(interactiveElement)) return true;
    return !!window.getSelection()?.toString();
}

export function TableRow({
    children,
    leading,
    onClick,
    onAuxClick,
}: PropsWithChildren<{
    leading?: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLTableRowElement>;
    onAuxClick?: React.MouseEventHandler<HTMLTableRowElement>;
}>): JSX.Element {
    function withRowClickGuard(handler?: React.MouseEventHandler<HTMLTableRowElement>) {
        if (!handler) return undefined;
        return (event: React.MouseEvent<HTMLTableRowElement>) => {
            if (!isRowClickIgnored(event)) handler(event);
        };
    }

    return (
        <tr
            onClick={withRowClickGuard(onClick)}
            onAuxClick={withRowClickGuard(onAuxClick)}
            className={cx({
                'cursor-pointer row-hover:bg-shader-neutral-light-8 dark:row-hover:bg-shader-neutral-dark-8 inner-link:-mx-xxs inner-link:rounded inner-link:px-xxs inner-link:transition-colors inner-link-hover:bg-iota-primary-90/30 inner-link-hover:ring-1 inner-link-hover:ring-iota-primary-70/60 dark:inner-link-hover:bg-iota-primary-70/30':
                    onClick,
            })}
        >
            {leading}
            {children}
        </tr>
    );
}

const TEXT_COLOR_CLASS = 'table-text-color';
const TEXT_SIZE_CLASS = 'text-body-md';

export function TableBody({ children }: PropsWithChildren): JSX.Element {
    return <tbody className={cx(TEXT_COLOR_CLASS, TEXT_SIZE_CLASS)}>{children}</tbody>;
}

export interface TableRowCheckboxProps {
    rowIndex: number;
    onCheckboxChange: (checked: boolean) => void;
    isDisabled?: boolean;
}

export function TableRowCheckbox({
    rowIndex,
    onCheckboxChange,
    isDisabled,
}: TableRowCheckboxProps): React.JSX.Element {
    const { selectedRowIndexes } = useTableContext();

    return (
        <TableCellBase isContentCentered>
            <Checkbox
                onCheckedChange={(event) => {
                    onCheckboxChange(event.target.checked);
                }}
                isChecked={selectedRowIndexes.has(rowIndex)}
                isDisabled={isDisabled}
            />
        </TableCellBase>
    );
}

export interface TableHeaderCheckboxProps {
    onCheckboxChange: (checked: boolean) => void;
}

export function TableHeaderCheckbox({ onCheckboxChange }: TableHeaderCheckboxProps): JSX.Element {
    const { isHeaderChecked, isHeaderIndeterminate } = useTableContext();

    return (
        <TableHeaderCell
            isContentCentered
            hasCheckbox
            onCheckboxChange={(event) => {
                onCheckboxChange(event.target.checked);
            }}
            isChecked={isHeaderChecked}
            columnKey={1}
            isIndeterminate={isHeaderIndeterminate}
        />
    );
}
