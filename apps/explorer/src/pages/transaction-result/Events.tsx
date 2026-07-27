// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Accordion,
    AccordionHeader,
    AccordionContent,
    KeyValueInfo,
    TitleSize,
} from '@iota/apps-ui-kit';
import { type IotaEvent } from '@iota/iota-sdk/client';
import { formatAddress, parseStructTag } from '@iota/iota-sdk/utils';
import { TriangleDown } from '@iota/apps-ui-icons';
import clsx from 'clsx';
import { useState } from 'react';
import { ProgrammableTxnBlockCard, SyntaxHighlighter } from '~/components';
import { CollapsibleCard, ObjectLink } from '~/components/ui';
import { onCopySuccess } from '~/lib';

function EventContent({ event }: { event: IotaEvent }): JSX.Element {
    const [open, setOpen] = useState(false);
    const { address, module, name } = parseStructTag(event.type);
    const objectLinkLabel = [formatAddress(address), module, name].join('::');

    return (
        <div className="flex flex-col gap-3 px-md pb-lg pt-xs">
            <KeyValueInfo
                keyText="Type"
                value={objectLinkLabel}
                copyText={[address, module, name].join('::')}
                onCopySuccess={onCopySuccess}
                isTruncated
            />

            <KeyValueInfo
                keyText="Event Emitter"
                value={
                    <ObjectLink
                        objectId={event.packageId}
                        queryStrings={{ module: event.transactionModule }}
                        label={`${formatAddress(event.packageId)}::${event.transactionModule}`}
                        copyText={event.packageId}
                    />
                }
                isTruncated
            />
            <Accordion hideBorder>
                <AccordionHeader hideArrow isExpanded={open} onToggle={() => setOpen(!open)}>
                    <div className="flex w-full flex-row items-center gap-xxxs pl-xxs text-iota-neutral-40 dark:text-iota-neutral-60">
                        <span className="text-body-md">{open ? 'Hide' : 'View'} Event Data</span>

                        <TriangleDown
                            className={clsx(
                                'h-5 w-5',
                                open
                                    ? 'rotate-0 transition-transform ease-linear'
                                    : '-rotate-90 transition-transform ease-linear',
                            )}
                        />
                    </div>
                </AccordionHeader>
                <AccordionContent isExpanded={open}>
                    <div className="mt-md">
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
                    <span className="ml-xs text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                        {name}
                    </span>
                }
                collapsible
                initialClose
                titleSize={TitleSize.Small}
            >
                <EventContent event={event} />
            </CollapsibleCard>
        );
    });

    return (
        <ProgrammableTxnBlockCard
            items={expandableItems}
            itemsLabel="Events"
            rawData={events}
            defaultItemsToShow={4}
        />
    );
}
