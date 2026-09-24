// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import {
    Accordion,
    AccordionHeader,
    AccordionContent,
    Badge,
    BadgeType,
    BadgeSize,
} from '@iota/apps-ui-kit';
import { type IotaEvent } from '@iota/iota-sdk/client';
import { parseStructTag } from '@iota/iota-sdk/utils';
import { TriangleDown } from '@iota/apps-ui-icons';
import clsx from 'clsx';
import { CollapsibleCard, SyntaxHighlighter } from '~/components';
import { ObjectLink } from '~/components/ui';
import { DateDisplay } from '~/components/DateDisplay';

function EventRow({ event, index }: { event: IotaEvent; index: number }): JSX.Element {
    const [open, setOpen] = useState(false);
    const { name } = parseStructTag(event.type);

    return (
        <div className="panel-border-color flex flex-col gap-xs rounded-lg border px-md--rs py-sm--rs">
            <div className="flex flex-wrap items-center gap-x-sm gap-y-xs">
                <span className="text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                    #{index}
                </span>
                <Badge type={BadgeType.PrimarySoft} label={name} size={BadgeSize.Small} />
                <span className="text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                    emitted by
                </span>
                <ObjectLink
                    objectId={event.packageId}
                    queryStrings={{ module: event.transactionModule }}
                    label={event.transactionModule}
                />
                {event.timestampMs && (
                    <span className="text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                        <DateDisplay
                            timestamp={event.timestampMs}
                            showTimeAgo
                            showTooltip={false}
                            showHoverStyle={false}
                        />
                    </span>
                )}
            </div>
            <Accordion hideBorder>
                <AccordionHeader hideArrow isExpanded={open} onToggle={() => setOpen(!open)}>
                    <div className="flex w-full flex-row items-center gap-xs text-iota-neutral-40 dark:text-iota-neutral-60">
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

    return (
        <CollapsibleCard title="Events" rawData={events}>
            <div className="mx-md--rs mb-md--rs mt-xs--rs flex max-h-[560px] flex-col gap-xs overflow-y-auto">
                {events.map((event, index) => (
                    <EventRow key={index} event={event} index={index} />
                ))}
            </div>
        </CollapsibleCard>
    );
}
