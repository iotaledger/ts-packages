// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode } from 'react';
import { Title, TitleSize } from '@iota/apps-ui-kit';
import type {
    IotaTransactionBlockResponse,
    TransactionEffects as TransactionEffectsData,
} from '@iota/iota-sdk/client';
import { CollapsibleCard, TransactionLink } from '~/components';
import { JsonPanel } from './JsonPanel';

function EffectsSection({
    title,
    tooltipText,
    children,
}: {
    title: string;
    tooltipText: string;
    children: ReactNode;
}): JSX.Element {
    return (
        <div className="flex flex-col gap-xs">
            <div className="px-md--rs [&>div]:px-0">
                <Title size={TitleSize.Small} title={title} tooltipText={tooltipText} />
            </div>
            <div className="px-md--rs">
                <div className="table-cell-border-color rounded-lg border px-md py-sm">
                    {children}
                </div>
            </div>
        </div>
    );
}

function getUnchangedSharedObjects(effects?: TransactionEffectsData) {
    const modifiedObjectIds = new Set(effects?.modifiedAtVersions?.map(({ objectId }) => objectId));
    return effects?.sharedObjects?.filter(({ objectId }) => !modifiedObjectIds.has(objectId)) ?? [];
}

export function hasEffectsDetails(effects?: TransactionEffectsData | null): boolean {
    return (
        !!effects?.dependencies?.length || !!getUnchangedSharedObjects(effects ?? undefined).length
    );
}

interface TransactionEffectsProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionEffects({ transaction }: TransactionEffectsProps): JSX.Element {
    const effects = transaction.effects ?? undefined;

    const dependencies = effects?.dependencies;
    const unchangedSharedObjects = getUnchangedSharedObjects(effects);

    return (
        <CollapsibleCard title="Effects" hideBorder rawData={effects}>
            <div className="flex w-full flex-col gap-md pb-md--rs">
                {!!dependencies?.length && (
                    <EffectsSection
                        title="Dependencies"
                        tooltipText="Transactions this one depends on: they produced the object versions it takes as input."
                    >
                        <div className="flex flex-wrap items-center gap-x-md gap-y-xs text-body-md">
                            {dependencies.map((digest) => (
                                <TransactionLink key={digest} digest={digest} copyText={digest} />
                            ))}
                        </div>
                    </EffectsSection>
                )}
                {!!unchangedSharedObjects.length && (
                    <EffectsSection
                        title="Unchanged Shared Objects"
                        tooltipText="Shared objects this transaction used without modifying them."
                    >
                        <JsonPanel data={unchangedSharedObjects} />
                    </EffectsSection>
                )}
            </div>
        </CollapsibleCard>
    );
}
