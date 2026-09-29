// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Select, SelectSize, Title } from '@iota/apps-ui-kit';
import { type IotaObjectChangeTypes, type ObjectChangeSummary } from '@iota/core';
import {
    type DisplayFieldsResponse,
    type TransactionBlockEffectsModifiedAtVersions,
} from '@iota/iota-sdk/client';
import { useMemo } from 'react';
import { TableCard } from '~/components/ui';
import { useAdvancedMode } from '~/contexts';
import { useLocalTablePagination } from '~/hooks';
import { PAGE_SIZES_RANGE_10_50 } from '~/lib/constants';
import { generateObjectChangesTableColumns, type ObjectChangeTableRow } from '~/lib/ui';
import { ObjectVersionContents } from '../ObjectVersionContents';

const STATUSES_WITHOUT_CONTENTS: IotaObjectChangeTypes[] = ['deleted', 'wrapped', 'published'];

function canShowObjectContents(row: ObjectChangeTableRow): boolean {
    return !!row.objectType && !!row.version && !STATUSES_WITHOUT_CONTENTS.includes(row.status);
}

interface ObjectChangesProps {
    objectSummary: ObjectChangeSummary;
    modifiedAtVersions?: TransactionBlockEffectsModifiedAtVersions[];
}

export function ObjectChanges({
    objectSummary,
    modifiedAtVersions,
}: ObjectChangesProps): JSX.Element | null {
    const { isAdvancedMode } = useAdvancedMode();

    const rows = useMemo<ObjectChangeTableRow[]>(() => {
        if (!objectSummary) return [];

        const previousVersions = new Map(
            modifiedAtVersions?.map(({ objectId, sequenceNumber }) => [objectId, sequenceNumber]),
        );

        return Object.entries(objectSummary).flatMap(([status, byOwner]) =>
            Object.entries(byOwner).flatMap(
                ([ownerAddress, { changes, changesWithDisplay, ownerType }]) =>
                    [...changesWithDisplay, ...changes].map((change) => {
                        const objectId = 'objectId' in change ? change.objectId : change.packageId;
                        return {
                            objectId,
                            ownerAddress: ownerAddress || undefined,
                            ownerType: ownerAddress ? ownerType : undefined,
                            objectType: 'objectType' in change ? change.objectType : undefined,
                            status: status as IotaObjectChangeTypes,
                            version: change.version,
                            previousVersion: previousVersions.get(objectId),
                            digest: 'digest' in change ? change.digest : undefined,
                            display:
                                'display' in change
                                    ? (change.display as DisplayFieldsResponse | undefined)
                                    : undefined,
                        };
                    }),
            ),
        );
    }, [objectSummary, modifiedAtVersions]);

    const { pageData, limit, setLimit, paginationOptions, supportingLabel } =
        useLocalTablePagination(rows, PAGE_SIZES_RANGE_10_50[0]);

    if (!rows.length) return null;

    const columns = generateObjectChangesTableColumns(isAdvancedMode);

    return (
        <div className="flex flex-col gap-xs">
            <Title title="Object Change" />
            <div className="px-md--rs">
                <TableCard
                    data={pageData}
                    columns={columns}
                    paginationOptions={paginationOptions}
                    totalLabel={supportingLabel}
                    getRowCanExpand={canShowObjectContents}
                    getRowId={(row) => row.objectId}
                    renderExpandedRow={(row) => (
                        <ObjectVersionContents
                            objectId={row.objectId}
                            version={row.version!}
                            label="Contents as written by this transaction"
                        />
                    )}
                    pageSizeSelector={
                        paginationOptions && (
                            <Select
                                value={limit.toString()}
                                options={PAGE_SIZES_RANGE_10_50.map((size) => ({
                                    label: `${size} / page`,
                                    id: size.toString(),
                                }))}
                                size={SelectSize.Small}
                                onValueChange={(value) => setLimit(Number(value))}
                            />
                        )
                    }
                />
            </div>
        </div>
    );
}
