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
}: CollapsibleCardProps) {
    const [open, setOpen] = useState(!initialClose);
    const [showRaw, setShowRaw] = useState(false);
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
        <div className="relative w-full">
            <Accordion hideBorder={hideBorder}>
                <AccordionHeader
                    hideArrow={hideArrow}
                    isExpanded={open}
                    onToggle={() => setOpen(!open)}
                >
                    <div className="flex w-full items-center">
                        <div className="flex-1">
                            {render ? (
                                render({ isOpen: open })
                            ) : (
                                <Title
                                    size={titleSize}
                                    title={title ?? ''}
                                    supportingElement={supportingTitleElement}
                                />
                            )}
                        </div>
                        {rawToggle}
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
            <div className="flex w-full items-center">
                <div className="flex-1">
                    <Title size={titleSize} title={title ?? ''} />
                </div>
                {rawToggle && <div className="pr-md">{rawToggle}</div>}
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
