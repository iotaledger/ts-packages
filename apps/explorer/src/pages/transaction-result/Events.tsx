// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Accordion, AccordionHeader, AccordionContent, TitleSize } from '@iota/apps-ui-kit';
import { type IotaEvent } from '@iota/iota-sdk/client';
import { formatAddress, parseStructTag } from '@iota/iota-sdk/utils';
import { TriangleDown } from '@iota/apps-ui-icons';
import clsx from 'clsx';
import { ProgrammableTxnBlockCard, SyntaxHighlighter } from '~/components';
import { CollapsibleCard, ObjectLink } from '~/components/ui';
import { onCopySuccess } from '~/lib';
import { CopyButton, StackedField } from './programmable-transaction-view/Field';

function EventContent({ event }: { event: IotaEvent }): JSX.Element {
    const [open, setOpen] = useState(false);
    const { address, module, name } = parseStructTag(event.type);
    const objectLinkLabel = [formatAddress(address), module, name].join('::');

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col divide-y divide-iota-neutral-92 px-lg pb-lg pt-md--rs dark:divide-iota-neutral-12">
            <StackedField
                keyText="Type"
                value={
                    <span className="flex items-center gap-xs">
                        <span className="truncate">{objectLinkLabel}</span>
                        <CopyButton
                            text={[address, module, name].join('::')}
                            onCopySuccess={onCopySuccess}
                        />
                    </span>
                }
            />

            <StackedField
                keyText="Event Emitter"
                value={
                    <ObjectLink
                        objectId={event.packageId}
                        queryStrings={{ module: event.transactionModule }}
                        label={`${formatAddress(event.packageId)}::${event.transactionModule}`}
                        copyText={event.packageId}
                    />
                }
            />
            <Accordion hideBorder>
                <AccordionHeader hideArrow isExpanded={open} onToggle={() => setOpen(!open)}>
                    <div className="flex w-full flex-row items-center gap-xs pl-xxs text-iota-neutral-40 dark:text-iota-neutral-60">
                        <TriangleDown
                            className={clsx(
                                'h-4 w-4 shrink-0 transition-transform ease-linear',
                                open ? 'rotate-0' : '-rotate-90',
                            )}
                        />
                        <span className="text-label-md">{open ? 'Hide' : 'View'} Event Data</span>
                    </div>
                </AccordionHeader>
                <AccordionContent isExpanded={open}>
                    <div className="mt-sm">
                        <SyntaxHighlighter code={JSON.stringify(event, null, 2)} language="json" />
                    </div>
                </AccordionContent>
            </Accordion>
        </div>
    );
}

interface EventsProps {
    events: IotaEvent[];
}

export function Events({ events }: EventsProps): JSX.Element | null {
    if (!events?.length) {
        return null;
    }

    const expandableItems = events.map((event, index) => {
        const { name } = parseStructTag(event.type);

        return (
            <CollapsibleCard
                key={index}
                title={`Event ${index}`}
                supportingTitleElement={
                    <span className="ml-xs text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                        {name}
                    </span>
                }
                collapsible
                compactHeader
                initialClose
                titleSize={TitleSize.Small}
                isTransparent
            >
                <EventContent event={event} />
            </CollapsibleCard>
        );
    });

    return (
        <ProgrammableTxnBlockCard items={expandableItems} itemsLabel="Events" rawData={events} />
    );
}
