// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    ButtonUnstyled,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    Panel,
    Placeholder,
} from '@iota/apps-ui-kit';
import { CheckmarkFilled, Copy, Warning } from '@iota/apps-ui-icons';
import { useCopyToClipboard } from '@iota/core';
import clsx from 'clsx';
import { type MetaItem, PageHeaderMeta } from './PageHeaderMeta';

type PageHeaderType =
    | 'Transaction'
    | 'Checkpoint'
    | 'Address'
    | 'Object'
    | 'Package'
    | 'Identity'
    | 'Notarization'
    | 'Abstract Account';

export interface PageHeaderProps {
    title: string | React.JSX.Element;
    subtitle?: string | null;
    metaItems?: MetaItem[];
    type: PageHeaderType;
    typeBadge?: React.ReactNode;
    summary?: React.ReactNode;
    navigation?: React.ReactNode;
    status?: 'success' | 'failure';
    after?: React.ReactNode;
    error?: string;
    loading?: boolean;
    showCopyButton?: boolean;
    isLoadingSubtitle?: boolean;
    leading?: React.ReactNode;
    contentWidthClassName?: string;
    afterWidthClassName?: string;
    rowAlignClassName?: string;
}

const STATUS_CHIP_CONTENT: Record<
    NonNullable<PageHeaderProps['status']>,
    { label: string; icon: React.ReactNode; classes: string }
> = {
    success: {
        label: 'Success',
        icon: <CheckmarkFilled className="size-5 shrink-0" />,
        classes: 'bg-success-surface text-on-success',
    },
    failure: {
        label: 'Failed',
        icon: <Warning className="size-5 shrink-0" />,
        classes: 'bg-error-surface text-on-error',
    },
};

function StatusChip({ status }: { status: NonNullable<PageHeaderProps['status']> }): JSX.Element {
    const { label, icon, classes } = STATUS_CHIP_CONTENT[status];
    return (
        <div
            className={clsx(
                'flex items-center gap-xs rounded-full px-md py-xs text-label-lg',
                classes,
            )}
        >
            {icon}
            <span>{label}</span>
        </div>
    );
}

export function PageHeader({
    title,
    subtitle,
    metaItems,
    type,
    typeBadge,
    summary,
    navigation,
    error,
    loading,
    after,
    status,
    showCopyButton = true,
    isLoadingSubtitle,
    leading,
    contentWidthClassName = 'md:w-3/4',
    afterWidthClassName = 'md:w-1/4',
    rowAlignClassName = 'md:items-center',
}: PageHeaderProps): JSX.Element {
    const copyToClipboard = useCopyToClipboard();

    async function handleCopyClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        if (title && typeof title === 'string') {
            const success = await copyToClipboard(title);
            if (!success) {
                console.error('Failed to copy to clipboard.');
            }
        }
    }

    const hasLeading = Boolean(leading) && !loading;

    const contentColumn = (
        <div
            className={clsx(
                'flex w-full flex-col',
                subtitle ? 'gap-sm' : 'gap-xs',
                !hasLeading && [contentWidthClassName, 'md:justify-center'],
            )}
        >
            {loading ? (
                <div className="flex w-full flex-col gap-xs">
                    {new Array(2).fill(0).map((_, index) => (
                        <Placeholder key={index} width={index === 0 ? 'w-1/2' : 'w-2/3'} />
                    ))}
                </div>
            ) : (
                <>
                    {type && !hasLeading && (
                        <div className="flex flex-row items-center gap-xs">
                            <span className="text-headline-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                                {type}
                            </span>
                            {typeBadge}
                            {status && <StatusChip status={status} />}
                        </div>
                    )}
                    {title && (
                        <div className="flex items-center gap-xxs text-iota-neutral-40 dark:text-iota-neutral-60">
                            <span
                                className={clsx(
                                    'break-all',
                                    hasLeading ? 'text-body-md' : 'text-body-ds-lg',
                                )}
                                data-testid="heading-object-id"
                            >
                                {title}
                            </span>
                            {showCopyButton && (
                                <ButtonUnstyled
                                    onClick={handleCopyClick}
                                    aria-label="Copy to clipboard"
                                >
                                    <Copy className="shrink-0 cursor-pointer" />
                                </ButtonUnstyled>
                            )}
                        </div>
                    )}

                    {isLoadingSubtitle ? (
                        <Placeholder width="w-48" />
                    ) : subtitle ? (
                        <span className="truncate text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                            {subtitle}
                        </span>
                    ) : null}

                    {summary && <div className="mt-xs">{summary}</div>}

                    {metaItems && <PageHeaderMeta items={metaItems} />}
                    {error && (
                        <div className="mt-xs--rs flex">
                            <InfoBox
                                title={error}
                                icon={<Warning />}
                                type={InfoBoxType.Error}
                                style={InfoBoxStyle.Elevated}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );

    const panel = (
        <Panel>
            <div className="flex w-full items-center p-md--rs">
                <div
                    className={clsx(
                        'flex w-full flex-col items-start justify-between gap-sm md:flex-row',
                        rowAlignClassName,
                    )}
                >
                    {hasLeading ? (
                        <div
                            className={clsx(
                                'flex w-full min-w-0 flex-row items-center gap-lg',
                                contentWidthClassName,
                            )}
                        >
                            <div className="shrink-0">{leading}</div>
                            {contentColumn}
                        </div>
                    ) : (
                        contentColumn
                    )}
                    {after && <div className={clsx('w-full', afterWidthClassName)}>{after}</div>}
                </div>
            </div>
            {!loading && navigation}
        </Panel>
    );

    if (!hasLeading) {
        return panel;
    }

    return (
        <div className="flex w-full flex-col gap-xs">
            {type && (
                <span className="text-label-lg text-iota-neutral-40 dark:text-iota-neutral-60">
                    {type}
                </span>
            )}
            {panel}
        </div>
    );
}
