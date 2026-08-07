// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Select, SelectSize, Title } from '@iota/apps-ui-kit';
import { type BalanceChangeSummary } from '@iota/core';
import { useMemo } from 'react';
import { TableCard } from '~/components/ui';
import { useLocalTablePagination } from '~/hooks';
import { PAGE_SIZES_RANGE_10_50 } from '~/lib/constants';
import { generateBalanceChangesTableColumns, type BalanceChangeTableRow } from '~/lib/ui';

interface BalanceChangesProps {
    changes: BalanceChangeSummary;
}

export function BalanceChanges({ changes }: BalanceChangesProps): JSX.Element | null {
    const rows = useMemo<BalanceChangeTableRow[]>(
        () =>
            changes
                ? Object.entries(changes).flatMap(([ownerAddress, ownerChanges]) =>
                      ownerChanges.map((change) => ({ ownerAddress, change })),
                  )
                : [],
        [changes],
    );

    const { pageData, limit, setLimit, paginationOptions, supportingLabel } =
        useLocalTablePagination(rows, PAGE_SIZES_RANGE_10_50[0]);

    if (!rows.length) return null;

    const columns = generateBalanceChangesTableColumns();

    return (
        <div className="flex flex-col gap-xs">
            <Title title="Balance Change" />
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
