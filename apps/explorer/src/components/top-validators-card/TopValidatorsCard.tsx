// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Link, PlaceholderTable, TableCard } from '~/components/ui';
import { generateValidatorsTableColumns } from '~/lib/ui';
import {
    Button,
    ButtonSize,
    ButtonType,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    Panel,
    Title,
} from '@iota/apps-ui-kit';
import { ErrorBoundary } from '../error-boundary/ErrorBoundary';
import { Info, Warning } from '@iota/apps-ui-icons';
import { useIotaClientQuery } from '@iota/dapp-kit';
import { useGetValidatorsApy, useGetValidatorsEvents, useMaxCommitteeSize } from '@iota/core';

const NUMBER_OF_VALIDATORS = 5;

const INCLUDE_COLUMNS = [
    'Validator',
    'Stake',
    'APY',
    'Effective Commission',
    'Last Epoch Rewards',
    'Voting Power',
];

type TopValidatorsCardProps = {
    limit?: number;
    showIcon?: boolean;
};

export function TopValidatorsCard({ limit, showIcon }: TopValidatorsCardProps): JSX.Element {
    const { data, isPending, isSuccess, isError } = useIotaClientQuery('getLatestIotaSystemState');
    const { data: validatorsApy } = useGetValidatorsApy();
    const { data: maxCommitteeSize } = useMaxCommitteeSize();
    const numberOfValidators = data?.activeValidators?.length ?? 0;
    const { data: validatorEvents, isPending: eventsLoading } = useGetValidatorsEvents({
        limit: numberOfValidators,
        order: 'descending',
    });

    const committeeMembers = data?.committeeMembers || [];
    const atRiskValidators = data?.atRiskValidators || [];
    const activeValidators = data?.activeValidators || [];

    const tableColumns = generateValidatorsTableColumns({
        showValidatorIcon: showIcon,
        committeeMembers: committeeMembers.map((v) => v.iotaAddress),
        atRiskValidators,
        maxCommitteeSize,
        validatorEvents,
        rollingAverageApys: validatorsApy,
        includeColumns: INCLUDE_COLUMNS,
        currentEpoch: data?.epoch,
    });

    const rowCount = limit ?? NUMBER_OF_VALIDATORS;
    const isLoading = isPending || eventsLoading;

    return (
        <Panel>
            <div className="relative">
                <div className="flex w-full flex-row items-center justify-between">
                    <Title title="Top Validators" />
                    <div className="px-md--rs py-xxs">
                        <Link to="/validators">
                            <Button
                                type={ButtonType.Secondary}
                                size={ButtonSize.Small}
                                text="View All"
                            />
                        </Link>
                    </div>
                </div>

                <div className="p-md">
                    {isError ? (
                        !isPending && !data?.activeValidators?.length ? (
                            <InfoBox
                                title="No validators found"
                                supportingText="There are currently no validators to display."
                                icon={<Info />}
                                type={InfoBoxType.Default}
                                style={InfoBoxStyle.Default}
                            />
                        ) : (
                            <InfoBox
                                title="Failed loading data"
                                supportingText="Validator data could not be loaded"
                                icon={<Warning />}
                                type={InfoBoxType.Error}
                                style={InfoBoxStyle.Default}
                            />
                        )
                    ) : null}

                    {isLoading && (
                        <PlaceholderTable
                            rowCount={rowCount}
                            rowHeight="13px"
                            colHeadings={INCLUDE_COLUMNS}
                        />
                    )}

                    {isSuccess && !eventsLoading && (
                        <ErrorBoundary>
                            <TableCard
                                sortTable
                                allowManualTableSort={false}
                                defaultSorting={[{ id: 'stakingPoolIotaBalance', desc: true }]}
                                data={activeValidators}
                                columns={tableColumns}
                                rowLimit={rowCount}
                            />
                        </ErrorBoundary>
                    )}
                </div>
            </div>
        </Panel>
    );
}
