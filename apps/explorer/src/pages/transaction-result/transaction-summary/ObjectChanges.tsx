// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Select, SelectSize, Title } from '@iota/apps-ui-kit';
import { type IotaObjectChangeTypes, type ObjectChangeSummary } from '@iota/core';
import { type DisplayFieldsResponse } from '@iota/iota-sdk/client';
import { useMemo } from 'react';
import { TableCard } from '~/components/ui';
import { useLocalTablePagination } from '~/hooks';
import { PAGE_SIZES_RANGE_10_50 } from '~/lib/constants';
import { generateObjectChangesTableColumns, type ObjectChangeTableRow } from '~/lib/ui';

interface ObjectChangesProps {
    objectSummary: ObjectChangeSummary;
}

export function ObjectChanges({ objectSummary }: ObjectChangesProps): JSX.Element | null {
    const rows = useMemo<ObjectChangeTableRow[]>(() => {
        if (!objectSummary) return [];

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
                            display:
                                'display' in change
                                    ? (change.display as DisplayFieldsResponse | undefined)
                                    : undefined,
                        };
                    }),
            ),
        );
    }, [objectSummary]);

    const { pageData, limit, setLimit, paginationOptions, supportingLabel } =
        useLocalTablePagination(rows, PAGE_SIZES_RANGE_10_50[0]);

    if (!rows.length) return null;

    const columns = generateObjectChangesTableColumns();

    return (
        <div className="flex flex-col gap-xs">
            <Title title="Object Change" />
            <TableCard
                data={pageData}
                columns={columns}
                paginationOptions={paginationOptions}
                totalLabel={supportingLabel}
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
    );
}
