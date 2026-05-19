// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    TableCellBase,
    TableCellText,
    ButtonSegment,
    ButtonSegmentType,
    Panel,
    SegmentedButton,
    SegmentedButtonType,
    Title,
    Input,
    InputType,
} from '@iota/apps-ui-kit';
import {
    useCapabilities,
    CapabilityFilterValue,
    DEFAULT_CAPABILITIES_LIMIT,
} from '../hooks/useCapabilities';
import { type Capability } from '../hooks/mockCapabilities';
import { TableCard, TransactionLink, Pagination, PlaceholderTable } from '~/components';
import { formatDigest } from '@iota/iota-sdk/utils';
import { type Dispatch, type SetStateAction, useReducer, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';

interface CapabilitiesViewProps {
    objectId: string;
}

enum PageAction {
    Next,
    Prev,
    First,
}

type PageStateByFilterMap = {
    [CapabilityFilterValue.Issued]: number;
    [CapabilityFilterValue.Revoked]: number;
};

type CapabilitiesActionType = {
    type: PageAction;
    filterValue: CapabilityFilterValue;
};

const FILTER_OPTIONS: { label: string; value: CapabilityFilterValue }[] = [
    { label: 'Issued', value: CapabilityFilterValue.Issued },
    { label: 'Revoked', value: CapabilityFilterValue.Revoked },
];

function reducer(
    state: PageStateByFilterMap,
    action: CapabilitiesActionType,
): PageStateByFilterMap {
    switch (action.type) {
        case PageAction.Next:
            return {
                ...state,
                [action.filterValue]: state[action.filterValue] + 1,
            };
        case PageAction.Prev:
            return {
                ...state,
                [action.filterValue]: state[action.filterValue] - 1,
            };
        case PageAction.First:
            return {
                ...state,
                [action.filterValue]: 0,
            };
        default:
            return { ...state };
    }
}

interface FiltersControlProps {
    filterValue: string;
    setFilterValue: Dispatch<SetStateAction<CapabilityFilterValue>>;
}

export function FiltersControl({ filterValue, setFilterValue }: FiltersControlProps): JSX.Element {
    return (
        <SegmentedButton type={SegmentedButtonType.Outlined}>
            {FILTER_OPTIONS.map(({ label, value }) => (
                <ButtonSegment
                    key={value}
                    onClick={() => setFilterValue(value)}
                    label={label}
                    selected={filterValue === value}
                    type={ButtonSegmentType.Rounded}
                />
            ))}
        </SegmentedButton>
    );
}

export function CapabilitiesView({ objectId }: CapabilitiesViewProps) {
    const [filterValue, setFilterValue] = useState(CapabilityFilterValue.Issued);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPageState, dispatch] = useReducer(reducer, {
        [CapabilityFilterValue.Issued]: 0,
        [CapabilityFilterValue.Revoked]: 0,
    });

    const { data, isPending, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } =
        useCapabilities(filterValue);

    const currentPage = currentPageState[filterValue];

    const capabilities = data?.pages[currentPage]?.data ?? [];
    const filteredCapabilities = capabilities.filter((capability) =>
        capability.holderAddress.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <Panel>
            <div data-testid="tx">
                <div className="flex w-full flex-col justify-between gap-xxs p-md--rs sm:flex-row md:items-center">
                    <Title title="Capabilities" />
                    <div className="inline-flex content-between items-center gap-x-2">
                        <Input
                            type={InputType.Text}
                            placeholder="Holder Address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <div className="flex-shrink-0">
                            {' '}
                            {/* This wrapper prevents wrapping */}
                            <FiltersControl
                                filterValue={filterValue}
                                setFilterValue={setFilterValue}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-sm p-md--rs">
                    {isPending ||
                    isFetching ||
                    isFetchingNextPage ||
                    !data?.pages[currentPage]?.data ? (
                        <PlaceholderTable
                            rowCount={DEFAULT_CAPABILITIES_LIMIT}
                            rowHeight="16px"
                            colHeadings={[
                                'Holder Address',
                                'Role',
                                'Status',
                                'Valid From',
                                'Valid Until',
                            ]}
                        />
                    ) : (
                        <div>
                            <CapabilitiesTable capabilities={filteredCapabilities} />
                        </div>
                    )}

                    {(hasNextPage || (data && data?.pages.length > 1)) && (
                        <Pagination
                            hasFirst={currentPageState[filterValue] !== 0}
                            onNext={() => {
                                if (isPending || isFetching) {
                                    return;
                                }

                                // Make sure we are at the end before fetching another page
                                if (
                                    data &&
                                    currentPageState[filterValue] === data?.pages.length - 1 &&
                                    !isPending &&
                                    !isFetching
                                ) {
                                    fetchNextPage();
                                }
                                dispatch({
                                    type: PageAction.Next,

                                    filterValue,
                                });
                            }}
                            hasNext={
                                (Boolean(hasNextPage) && Boolean(data?.pages[currentPage])) ||
                                currentPage < (data?.pages.length ?? 0) - 1
                            }
                            hasPrev={currentPageState[filterValue] !== 0}
                            onPrev={() =>
                                dispatch({
                                    type: PageAction.Prev,

                                    filterValue,
                                })
                            }
                            onFirst={() =>
                                dispatch({
                                    type: PageAction.First,
                                    filterValue,
                                })
                            }
                        />
                    )}
                </div>
            </div>
        </Panel>
    );
}

function CapabilitiesTable({ capabilities }: { capabilities: Capability[] }) {
    return <TableCard data={capabilities} columns={generateCapabilitiesTableColumns()} />;
}

export function generateCapabilitiesTableColumns(): ColumnDef<Capability>[] {
    const getTimeWindowStatus = (
        validFrom: Date | null,
        validUntil: Date | null,
    ): { label: string; variant: string } => {
        const now = new Date();
        if (validFrom && now < validFrom) {
            return { label: 'To Be Active', variant: 'warning' };
        }
        if (validUntil && now > validUntil) {
            return { label: 'Expired', variant: 'error' };
        }
        return { label: 'Active', variant: 'success' };
    };
    return [
        {
            accessorKey: 'holderAddress',
            header: 'Holder Address',
            cell: ({ getValue }) => {
                const digest = getValue<string>();
                return (
                    <TableCellBase>
                        <TransactionLink
                            digest={digest}
                            label={<TableCellText>{formatDigest(digest)}</TableCellText>}
                            copyText={digest}
                        />
                    </TableCellBase>
                );
            },
        },
        {
            accessorKey: 'role',
            header: 'Role',
            cell: ({ getValue }) => {
                const role = getValue<string>();
                return (
                    <TableCellBase>
                        <TableCellText>{role}</TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row, getValue }) => {
                const status = getValue<string>();
                const validFromOptional = row.getValue<Date | null>('validFrom');
                const validUntilOptional = row.getValue<Date | null>('validUntil');
                const statusLabel =
                    status === 'revoked'
                        ? 'Revoked'
                        : getTimeWindowStatus(validFromOptional, validUntilOptional).label;
                return (
                    <TableCellBase>
                        <TableCellText>{statusLabel}</TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            accessorKey: 'validFrom',
            header: 'Valid From',
            cell: ({ getValue }) => {
                const fromDateOptional = getValue<Date | null>();
                const fromValue =
                    fromDateOptional == null ? 'N/A' : fromDateOptional.toLocaleString('en');
                return (
                    <TableCellBase>
                        <TableCellText>{fromValue}</TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            accessorKey: 'validUntil',
            header: 'Valid Until',
            cell: ({ getValue }) => {
                const fromDateOptional = getValue<Date | null>();
                const fromValue =
                    fromDateOptional == null ? 'N/A' : fromDateOptional.toLocaleString('en');
                return (
                    <TableCellBase>
                        <TableCellText>{fromValue}</TableCellText>
                    </TableCellBase>
                );
            },
        },
    ];
}
