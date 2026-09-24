// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Accordion,
    AccordionContent,
    AccordionHeader,
    ButtonUnstyled,
    Divider,
    Panel,
    Title,
    TitleSize,
} from '@iota/apps-ui-kit';
import { ArrowDown } from '@iota/apps-ui-icons';
import clsx from 'clsx';
import { type ReactNode, useState } from 'react';
import { SyntaxHighlighter } from '../../syntax-highlighter';

export interface CollapsibleCardProps {
    children: ReactNode;
    title?: string;
    footer?: ReactNode;
    collapsible?: boolean;
    initialClose?: boolean;
    titleSize?: TitleSize;
    hideArrow?: boolean;
    hideBorder?: boolean;
    render?: ({ isOpen }: { isOpen: boolean }) => ReactNode;
    supportingTitleElement?: ReactNode;
    isTransparentPanel?: boolean;
    rawData?: unknown;
    compactHeader?: boolean;
    isTransparent?: boolean;
}

interface RawJsonToggleProps {
    isActive: boolean;
    onToggle: () => void;
}

function RawJsonToggle({ isActive, onToggle }: RawJsonToggleProps): JSX.Element {
    return (
        <ButtonUnstyled
            aria-label="Toggle raw JSON"
            onClick={(event) => {
                event.stopPropagation();
                onToggle();
            }}
            className={clsx(
                'shrink-0 rounded-full border px-xs py-xxs text-label-sm',
                isActive
                    ? 'badge-bg-color-primary-soft badge-border-color-soft badge-text-color-primary-soft'
                    : 'badge-border-color-neutral badge-text-color-neutral bg-transparent',
            )}
        >
            RAW
        </ButtonUnstyled>
    );
}

function RawJsonContent({ rawData }: { rawData: unknown }): JSX.Element {
    return (
        <div className="p-md--rs">
            <SyntaxHighlighter code={JSON.stringify(rawData, null, 2)} language="json" />
        </div>
    );
}

export function CollapsibleCard({
    title,
    footer,
    collapsible,
    children,
    initialClose,
    titleSize = TitleSize.Medium,
    hideArrow,
    hideBorder,
    render,
    supportingTitleElement,
    isTransparentPanel,
    rawData,
    compactHeader,
}: CollapsibleCardProps) {
    const [open, setOpen] = useState(!initialClose);
    const [showRaw, setShowRaw] = useState(false);
    const [isSupportingElementActive, setIsSupportingElementActive] = useState(false);

    const interactiveSupportingTitleElement = supportingTitleElement ? (
        <div
            className="contents"
            onClick={(event) => event.stopPropagation()}
            onMouseEnter={() => setIsSupportingElementActive(true)}
            onMouseLeave={() => setIsSupportingElementActive(false)}
            onFocus={() => setIsSupportingElementActive(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setIsSupportingElementActive(false);
                }
            }}
        >
            {supportingTitleElement}
        </div>
    ) : (
        supportingTitleElement
    );
    const content =
        showRaw && rawData !== undefined ? <RawJsonContent rawData={rawData} /> : children;
    const rawToggle = rawData !== undefined && (
        <RawJsonToggle
            isActive={showRaw}
            onToggle={() => {
                setShowRaw(!showRaw);
                setOpen(true);
            }}
        />
    );
    return collapsible ? (
        <div className="relative w-full" data-state={open ? 'open' : 'closed'}>
            <Accordion hideBorder={hideBorder}>
                <AccordionHeader
                    hideArrow={hideArrow || compactHeader}
                    isExpanded={open}
                    onToggle={() => setOpen(!open)}
                    disableStateLayer={isSupportingElementActive}
                >
                    <div
                        className={clsx(
                            'flex w-full items-center',
                            compactHeader && 'mx-auto max-w-5xl gap-md pr-md',
                        )}
                    >
                        <div
                            className={clsx(
                                'min-w-0 flex-1',
                                titleSize === TitleSize.Small ? 'pl-md' : 'pl-md--rs',
                            )}
                        >
                            {render ? (
                                render({ isOpen: open })
                            ) : (
                                <Title
                                    size={titleSize}
                                    title={title ?? ''}
                                    supportingElement={interactiveSupportingTitleElement}
                                />
                            )}
                        </div>
                        {rawToggle}
                        {compactHeader && !hideArrow && (
                            <div className="relative h-8 w-8 shrink-0">
                                <div
                                    aria-hidden="true"
                                    className="state-layer flex h-full w-full items-center justify-center rounded-full border border-iota-neutral-80 bg-iota-neutral-98 dark:border-iota-neutral-30 dark:bg-iota-neutral-10"
                                >
                                    <ArrowDown
                                        className={clsx(
                                            'h-5 w-5 text-iota-neutral-40 transition-transform ease-linear dark:text-iota-neutral-60',
                                            open && 'rotate-180',
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </AccordionHeader>
                <AccordionContent isExpanded={open}>{content}</AccordionContent>
                {footer && (
                    <>
                        <Divider />
                        <div className={clsx('rounded-b-2xl')}>{footer}</div>
                    </>
                )}
            </Accordion>
        </div>
    ) : (
        <Panel hasBorder={!hideBorder} bgColor={isTransparentPanel ? 'bg-transparent' : undefined}>
            <div className="flex w-full items-center px-md--rs py-sm--rs">
                <div className="flex-1">
                    <Title size={titleSize} title={title ?? ''} />
                </div>
                {rawToggle && <div className="pr-md--rs">{rawToggle}</div>}
            </div>
            <div>{content}</div>
            {footer && (
                <>
                    <Divider />
                    {footer}
                </>
            )}
        </Panel>
    );
}
