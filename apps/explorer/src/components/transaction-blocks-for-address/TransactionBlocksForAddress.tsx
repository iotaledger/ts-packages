// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type TransactionFilter } from '@iota/iota-sdk/client';
import {
    type Dispatch,
    type SetStateAction,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from 'react';
import { Pagination, PlaceholderTable, TableCard } from '~/components/ui';
import { RETENTION_BANNER_TEXT, RETENTION_BANNER_TITLE } from '~/lib/constants';
import { Warning } from '@iota/apps-ui-icons';
import {
    DEFAULT_TRANSACTIONS_LIMIT,
    useGetTransactionBlocks,
} from '~/hooks/useGetTransactionBlocks';
import { ObjectFilterValue } from '~/lib/enums';
import {
    ButtonSegment,
    ButtonSegmentType,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    Panel,
    SegmentedButton,
    SegmentedButtonType,
    Title,
} from '@iota/apps-ui-kit';
import { generateTransactionsTableColumns } from '~/lib/ui';

export interface TransactionBlocksFilterOption {
    label: string;
    /**
     * Stable identity of the segment. It must not change when `filter` changes,
     * otherwise the selected segment would silently jump to another one.
     */
    value: string;
    filter: TransactionFilter;
}

type TransactionBlocksForAddressProps = {
    address: string;
    /** Value of the option selected on first render. */
    filter?: string;
    header?: string;
    /**
     * Overrides the default object filters. Pagination is tracked per option
     * and reset whenever the active option's filter changes.
     */
    options?: TransactionBlocksFilterOption[];
};

enum PageAction {
    Next,
    Prev,
    First,
}

type TransactionBlocksForAddressActionType = {
    type: PageAction;
    filterValue: string;
};

type PageStateByFilterMap = Record<string, number>;

export function getObjectFilterOptions(address: string): TransactionBlocksFilterOption[] {
    return [
        {
            label: 'Input Objects',
            value: ObjectFilterValue.Input,
            filter: { InputObject: address },
        },
        {
            label: 'Updated Objects',
            value: ObjectFilterValue.Changed,
            filter: { ChangedObject: address },
        },
    ];
}

function reducer(
    state: PageStateByFilterMap,
    action: TransactionBlocksForAddressActionType,
): PageStateByFilterMap {
    const currentPage = state[action.filterValue] ?? 0;

    switch (action.type) {
        case PageAction.Next:
            return {
                ...state,
                [action.filterValue]: currentPage + 1,
            };
        case PageAction.Prev:
            return {
                ...state,
                [action.filterValue]: currentPage - 1,
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
    options: TransactionBlocksFilterOption[];
    filterValue: string;
    setFilterValue: Dispatch<SetStateAction<string>>;
}

export function FiltersControl({
    options,
    filterValue,
    setFilterValue,
}: FiltersControlProps): JSX.Element {
    return (
        <SegmentedButton type={SegmentedButtonType.Outlined}>
            {options.map(({ label, value }) => (
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

export function TransactionBlocksForAddress({
    address,
    filter = ObjectFilterValue.Changed,
    header,
    options,
}: TransactionBlocksForAddressProps): JSX.Element {
    const filterOptions = useMemo(
        () => options ?? getObjectFilterOptions(address),
        [options, address],
    );

    const [filterValue, setFilterValue] = useState<string>(filter);
    const [currentPageState, dispatch] = useReducer(reducer, {});

    // Falling back to the first option keeps the component usable when the
    // caller provides its own options and no `filter` matches them.
    const activeOption =
        filterOptions.find((option) => option.value === filterValue) ?? filterOptions[0];
    const activeValue = activeOption.value;
    const activeFilterKey = JSON.stringify(activeOption.filter);

    const { data, isPending, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } =
        useGetTransactionBlocks(activeOption.filter);

    // A segment can point at different filters over time (e.g. when the selected
    // module changes), and then its page index has to start over. Switching
    // between segments must not reset anything: each one keeps its own page.
    const lastFilterKeyByValue = useRef<Record<string, string>>({});
    useEffect(() => {
        const previousFilterKey = lastFilterKeyByValue.current[activeValue];
        lastFilterKeyByValue.current[activeValue] = activeFilterKey;

        if (previousFilterKey !== undefined && previousFilterKey !== activeFilterKey) {
            dispatch({ type: PageAction.First, filterValue: activeValue });
        }
    }, [activeFilterKey, activeValue]);

    const currentPage = currentPageState[activeValue] ?? 0;
    const tableColumns = generateTransactionsTableColumns(address);

    return (
        <Panel>
            <div data-testid="tx">
                <div className="flex w-full flex-col justify-between gap-xxs p-md--rs sm:flex-row md:items-center">
                    {header && <Title title={header} />}
                    <div className="inline-flex">
                        <FiltersControl
                            options={filterOptions}
                            filterValue={activeValue}
                            setFilterValue={setFilterValue}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-sm p-md--rs">
                    {isPending || isFetching || isFetchingNextPage || !data?.pages[currentPage] ? (
                        <PlaceholderTable
                            rowCount={DEFAULT_TRANSACTIONS_LIMIT}
                            rowHeight="16px"
                            colHeadings={['Type', 'Sender', 'Txns', 'Gas', 'Time']}
                        />
                    ) : (
                        <>
                            <InfoBox
                                title={RETENTION_BANNER_TITLE}
                                supportingText={RETENTION_BANNER_TEXT}
                                icon={<Warning />}
                                type={InfoBoxType.Warning}
                                style={InfoBoxStyle.Elevated}
                            />
                            {data.pages[currentPage].data.length ? (
                                <TableCard
                                    data={data.pages[currentPage].data}
                                    columns={tableColumns}
                                />
                            ) : (
                                <div className="flex justify-center py-md text-body-md text-iota-neutral-40">
                                    No transactions found
                                </div>
                            )}
                        </>
                    )}

                    {(hasNextPage || (data && data?.pages.length > 1)) && (
                        <Pagination
                            hasFirst={currentPage !== 0}
                            onNext={() => {
                                if (isPending || isFetching) {
                                    return;
                                }

                                // Make sure we are at the end before fetching another page
                                if (
                                    data &&
                                    currentPage === data?.pages.length - 1 &&
                                    !isPending &&
                                    !isFetching
                                ) {
                                    fetchNextPage();
                                }
                                dispatch({
                                    type: PageAction.Next,
                                    filterValue: activeValue,
                                });
                            }}
                            hasNext={
                                (Boolean(hasNextPage) && Boolean(data?.pages[currentPage])) ||
                                currentPage < (data?.pages.length ?? 0) - 1
                            }
                            hasPrev={currentPage !== 0}
                            onPrev={() =>
                                dispatch({
                                    type: PageAction.Prev,
                                    filterValue: activeValue,
                                })
                            }
                            onFirst={() =>
                                dispatch({
                                    type: PageAction.First,
                                    filterValue: activeValue,
                                })
                            }
                        />
                    )}
                </div>
            </div>
        </Panel>
    );
}
