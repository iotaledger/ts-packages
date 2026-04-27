// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeType, Panel, Title, TitleSize } from '@iota/apps-ui-kit';
import { formatAddress } from '@iota/iota-sdk/utils';

import { type NarratedObjectChange } from '../../utils/transaction/narrateObjectChanges';
import { type RenderExplorerLink } from '../../types';
import { ObjectDetail } from '../cards/ObjectChanges';
import { Collapsible } from '../collapsible';

interface NarratedObjectChangeGroupProps {
    title: string;
    items: NarratedObjectChange[];
    renderExplorerLink: RenderExplorerLink;
}

export function NarratedObjectChangeGroup({
    title,
    items,
    renderExplorerLink,
}: NarratedObjectChangeGroupProps) {
    if (!items.length) return null;

    return (
        <Panel hasBorder>
            <div className="flex flex-col gap-y-sm overflow-hidden rounded-xl">
                <Collapsible
                    hideBorder
                    defaultOpen
                    render={() => (
                        <Title
                            size={TitleSize.Small}
                            title={title}
                            trailingElement={
                                <div className="ml-1 flex">
                                    <Badge
                                        type={BadgeType.PrimarySoft}
                                        label={String(items.length)}
                                    />
                                </div>
                            }
                        />
                    )}
                >
                    <div className="flex flex-col">
                        {items.map((item, i) => (
                            <NarratedChangeRow
                                key={i}
                                item={item}
                                renderExplorerLink={renderExplorerLink}
                            />
                        ))}
                    </div>
                </Collapsible>
            </div>
        </Panel>
    );
}

interface NarratedChangeRowProps {
    item: NarratedObjectChange;
    renderExplorerLink: RenderExplorerLink;
}

function NarratedChangeRow({ item, renderExplorerLink }: NarratedChangeRowProps) {
    const { change, name, recipient } = item;

    // Derive a short human-readable label from the object type.
    const shortType =
        'objectType' in change
            ? (change.objectType?.split('::').pop()?.split('<')[0] ?? 'Object')
            : undefined;
    const label = name ?? shortType ?? 'Object';

    if (change.type === 'transferred') {
        return (
            <div className="flex w-full items-center justify-between px-md py-xs">
                <span className="text-body-md font-inter">{label}</span>
                {recipient && (
                    <span className="text-body-sm text-neutral-60 dark:text-neutral-40">
                        {formatAddress(recipient)}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {name && (
                <div className="px-md pt-xs">
                    <span className="text-body-md font-inter font-medium">{name}</span>
                </div>
            )}
            <ObjectDetail change={change} renderExplorerLink={renderExplorerLink} />
        </div>
    );
}
