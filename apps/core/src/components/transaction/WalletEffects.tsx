// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeType, Panel, Title, TitleSize } from '@iota/apps-ui-kit';

import { type TransactionDisplay } from '../../utils/transaction/buildTransactionDisplay';
import { type RenderExplorerLink } from '../../types';
import { BalanceChanges } from '../cards/BalanceChanges';
import { Collapsible } from '../collapsible';
import { ObjectDetail } from '../cards/ObjectChanges';

interface WalletEffectsProps {
    display: TransactionDisplay;
    renderExplorerLink: RenderExplorerLink;
    /** When true the object accordion opens by default (unrecognized PTBs). */
    defaultObjectsExpanded?: boolean;
}

interface ObjectGroupProps {
    title: string;
    items: { change: { objectId?: string; [key: string]: unknown }; name?: string }[];
    renderExplorerLink: RenderExplorerLink;
    defaultOpen?: boolean;
}

function ObjectGroup({ title, items, renderExplorerLink, defaultOpen }: ObjectGroupProps) {
    if (!items.length) return null;

    return (
        <Collapsible
            hideBorder
            defaultOpen={defaultOpen ?? false}
            render={() => (
                <Title
                    size={TitleSize.Small}
                    title={title}
                    trailingElement={
                        <div className="ml-1 flex">
                            <Badge type={BadgeType.PrimarySoft} label={String(items.length)} />
                        </div>
                    }
                />
            )}
        >
            <div className="flex flex-col">
                {items.map((item, i) => (
                    <div key={i} className="flex flex-col">
                        {item.name && (
                            <div className="px-md pt-xs">
                                <span className="text-body-md font-medium">{item.name}</span>
                            </div>
                        )}
                        <ObjectDetail
                            change={item.change as Parameters<typeof ObjectDetail>[0]['change']}
                            renderExplorerLink={renderExplorerLink}
                        />
                    </div>
                ))}
            </div>
        </Collapsible>
    );
}

export function WalletEffects({
    display,
    renderExplorerLink,
    defaultObjectsExpanded,
}: WalletEffectsProps) {
    const { narratedObjectChanges, balanceChangesByOwner } = display;

    const receivedItems = [...narratedObjectChanges.received, ...narratedObjectChanges.minted];
    const sentItems = narratedObjectChanges.sent;
    const keptItems = narratedObjectChanges.kept;
    const publishedItems = narratedObjectChanges.published;

    const hasObjects =
        receivedItems.length > 0 ||
        sentItems.length > 0 ||
        keptItems.length > 0 ||
        publishedItems.length > 0;

    const hasBalanceChanges = Object.keys(balanceChangesByOwner ?? {}).length > 0;

    if (!hasBalanceChanges && !hasObjects) return null;

    return (
        <Panel hasBorder>
            <div className="flex flex-col overflow-hidden rounded-xl">
                <Collapsible
                    hideBorder
                    defaultOpen={false}
                    render={() => <Title size={TitleSize.Small} title="Effects on your wallet" />}
                >
                    <div className="flex flex-col gap-y-sm pb-sm">
                        {hasBalanceChanges && (
                            <BalanceChanges
                                changes={balanceChangesByOwner}
                                renderExplorerLink={renderExplorerLink}
                            />
                        )}

                        {hasObjects && (
                            <div className="flex flex-col">
                                <ObjectGroup
                                    title="Objects received"
                                    items={receivedItems}
                                    renderExplorerLink={renderExplorerLink}
                                    defaultOpen={defaultObjectsExpanded}
                                />
                                <ObjectGroup
                                    title="Objects sent"
                                    items={sentItems}
                                    renderExplorerLink={renderExplorerLink}
                                    defaultOpen={defaultObjectsExpanded}
                                />
                                <ObjectGroup
                                    title="Objects published"
                                    items={publishedItems}
                                    renderExplorerLink={renderExplorerLink}
                                    defaultOpen={defaultObjectsExpanded}
                                />
                                <ObjectGroup
                                    title="Objects kept"
                                    items={keptItems}
                                    renderExplorerLink={renderExplorerLink}
                                />
                            </div>
                        )}
                    </div>
                </Collapsible>
            </div>
        </Panel>
    );
}
