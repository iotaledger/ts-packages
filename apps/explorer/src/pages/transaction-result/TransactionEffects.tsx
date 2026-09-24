// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode } from 'react';
import { TableCellBase, TableCellText, Title, TitleSize } from '@iota/apps-ui-kit';
import type {
    IotaObjectRef,
    IotaTransactionBlockResponse,
    TransactionEffects as TransactionEffectsData,
} from '@iota/iota-sdk/client';
import { formatDigest } from '@iota/iota-sdk/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { CollapsibleCard, ObjectLink, TransactionLink } from '~/components';
import { TableCard } from '~/components/ui';
import { NewDigestCell } from '~/lib/ui';
import { CopyButton } from './CopyButton';

function EffectsSection({
    title,
    tooltipText,
    isBoxed = true,
    children,
}: {
    title: string;
    tooltipText: string;
    isBoxed?: boolean;
    children: ReactNode;
}): JSX.Element {
    return (
        <div className="flex flex-col gap-xs">
            <div className="px-md--rs [&>div]:px-0">
                <Title size={TitleSize.Small} title={title} tooltipText={tooltipText} />
            </div>
            <div className="mx-md--rs max-h-[560px] overflow-y-auto">
                {isBoxed ? (
                    <div className="table-cell-border-color rounded-lg border px-md py-sm">
                        {children}
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}

const UNCHANGED_SHARED_OBJECT_COLUMNS: ColumnDef<IotaObjectRef>[] = [
    {
        header: 'Object ID',
        id: 'objectId',
        cell: ({ row }) => (
            <TableCellBase>
                <ObjectLink
                    objectId={row.original.objectId}
                    copyText={row.original.objectId}
                    className="[&>div]:max-w-[200px] [&>div]:truncate"
                />
            </TableCellBase>
        ),
    },
    {
        header: 'Version',
        id: 'version',
        cell: ({ row }) => (
            <TableCellBase>
                <TableCellText>v{row.original.version}</TableCellText>
            </TableCellBase>
        ),
    },
    {
        header: 'Digest',
        id: 'digest',
        cell: ({ row }) => <NewDigestCell digest={row.original.digest} />,
    },
];

function getUnchangedSharedObjects(effects?: TransactionEffectsData) {
    const modifiedObjectIds = new Set(effects?.modifiedAtVersions?.map(({ objectId }) => objectId));
    return effects?.sharedObjects?.filter(({ objectId }) => !modifiedObjectIds.has(objectId)) ?? [];
}

export function hasEffectsDetails(effects?: TransactionEffectsData | null): boolean {
    return (
        !!effects?.eventsDigest ||
        !!effects?.dependencies?.length ||
        !!getUnchangedSharedObjects(effects ?? undefined).length
    );
}

interface TransactionEffectsProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionEffects({ transaction }: TransactionEffectsProps): JSX.Element {
    const effects = transaction.effects ?? undefined;

    const eventsDigest = effects?.eventsDigest;
    const dependencies = effects?.dependencies;
    const unchangedSharedObjects = getUnchangedSharedObjects(effects);

    return (
        <CollapsibleCard title="Effects" hideBorder rawData={effects}>
            <div className="flex w-full flex-col gap-md pb-md--rs">
                {eventsDigest && (
                    <EffectsSection
                        title="Events Digest"
                        tooltipText="Hash of all the events emitted by this transaction."
                    >
                        <div className="flex flex-row items-center gap-x-xxs">
                            <span className="table-text-color text-body-md">
                                {formatDigest(eventsDigest)}
                            </span>
                            <CopyButton text={eventsDigest} />
                        </div>
                    </EffectsSection>
                )}
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
                        isBoxed={false}
                    >
                        <TableCard
                            data={unchangedSharedObjects}
                            columns={UNCHANGED_SHARED_OBJECT_COLUMNS}
                        />
                    </EffectsSection>
                )}
            </div>
        </CollapsibleCard>
    );
}
