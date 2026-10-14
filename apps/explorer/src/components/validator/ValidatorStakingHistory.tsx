// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType, Panel, Title } from '@iota/apps-ui-kit';
import { Info, Warning } from '@iota/apps-ui-icons';
import { useCursorPagination } from '@iota/core';
import { Pagination, PlaceholderTable, TableCard } from '~/components/ui';
import { useGetValidatorStakingEvents } from '~/hooks';
import { generateStakingHistoryTableColumns } from '~/lib/ui';
import { getInternalPath } from '~/lib/utils';

const STAKING_HISTORY_PAGE_SIZE = 10;

interface ValidatorStakingHistoryProps {
    validatorAddress: string;
}

export function ValidatorStakingHistory({
    validatorAddress,
}: ValidatorStakingHistoryProps): JSX.Element {
    const stakingEventsQuery = useGetValidatorStakingEvents({
        validatorAddress,
        limit: STAKING_HISTORY_PAGE_SIZE,
        order: 'descending',
    });
    const { data, isFetching, pagination, isPending, isError } =
        useCursorPagination(stakingEventsQuery);

    const tableColumns = generateStakingHistoryTableColumns();

    return (
        <Panel>
            <Title title="Staking History" />
            <div className="p-md--rs">
                {isError ? (
                    <InfoBox
                        title="Error"
                        supportingText="Failed to load staking history"
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Default}
                    />
                ) : isPending || isFetching || !data?.data ? (
                    <PlaceholderTable
                        rowCount={STAKING_HISTORY_PAGE_SIZE}
                        rowHeight="16px"
                        colHeadings={tableColumns.map(({ header }) => String(header))}
                    />
                ) : data.data.length === 0 ? (
                    <div className="flex flex-col gap-md">
                        <InfoBox
                            title="No staking events found"
                            supportingText={
                                pagination.hasNext
                                    ? 'No staking events for this validator in the scanned range of network events. Use Next to scan older events.'
                                    : 'There are no staking events for this validator.'
                            }
                            icon={<Info />}
                            type={InfoBoxType.Default}
                            style={InfoBoxStyle.Elevated}
                        />
                        <Pagination {...pagination} />
                    </div>
                ) : (
                    <TableCard
                        data={data.data}
                        columns={tableColumns}
                        getRowHref={({ id }) => getInternalPath('txblock', id.txDigest)}
                        paginationOptions={pagination}
                    />
                )}
            </div>
        </Panel>
    );
}
