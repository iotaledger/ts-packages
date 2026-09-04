// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType, Panel, Title } from '@iota/apps-ui-kit';
import { Warning } from '@iota/apps-ui-icons';
import { useCursorPagination } from '@iota/core';
import { PlaceholderTable, TableCard } from '~/components/ui';
import { useGetValidatorStakingEvents } from '~/hooks';
import { generateStakingHistoryTableColumns } from '~/lib/ui';

const STAKING_HISTORY_PAGE_SIZE = 10;

const STAKING_HISTORY_COLUMN_HEADINGS = [
    'Address',
    'Amount',
    'Reward',
    'Active Epoch',
    'Digest',
    'Age',
];

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
            <div className="px-md--rs py-sm--rs">
                <Title title="Staking History" />
            </div>
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
                        colHeadings={STAKING_HISTORY_COLUMN_HEADINGS}
                    />
                ) : (
                    <TableCard
                        data={data.data}
                        columns={tableColumns}
                        paginationOptions={pagination}
                    />
                )}
            </div>
        </Panel>
    );
}
