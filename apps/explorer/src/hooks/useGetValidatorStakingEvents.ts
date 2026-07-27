// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import type { EventId, IotaEvent } from '@iota/iota-sdk/client';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
    STAKING_REQUEST_EVENT,
    UNSTAKING_REQUEST_EVENT,
    type StakeEventJson,
    type UnstakeEventJson,
} from '@iota/core';

// NOTE: This copies the query limit from our Rust JSON RPC backend, this needs to be kept in sync!
const RAW_QUERY_LIMIT = 50;

// Full nodes only retain a bounded window of past events, and `validator_address` can only be
// matched client-side (there is no server-side filter for it). This caps how many raw pages we
// scan per fetch so a sparsely-staked validator can't trigger an unbounded chain of RPC calls.
const MAX_RAW_FETCHES_PER_PAGE = 20;

interface UseGetValidatorStakingEventsOptions {
    validatorAddress?: string;
    limit: number;
    order?: 'ascending' | 'descending';
}

interface EventStreamState {
    cursor: EventId | null;
    hasNextPage: boolean;
    // Matched events already fetched but not yet consumed by the merge step, kept in fetch order.
    buffer: IotaEvent[];
}

interface StakingEventsPageParam {
    stake: EventStreamState;
    unstake: EventStreamState;
}

interface StakingEventsPage {
    data: IotaEvent[];
    nextCursor: StakingEventsPageParam;
    hasNextPage: boolean;
}

const INITIAL_PAGE_PARAM: StakingEventsPageParam = {
    stake: { cursor: null, hasNextPage: true, buffer: [] },
    unstake: { cursor: null, hasNextPage: true, buffer: [] },
};

function matchesValidator(event: IotaEvent, validatorAddress: string): boolean {
    const parsedJson = event.parsedJson as StakeEventJson | UnstakeEventJson;
    return parsedJson?.validator_address === validatorAddress;
}

function eventTimestamp(event: IotaEvent | undefined): number {
    return Number(event?.timestampMs ?? 0);
}

/** Returns true when `a`'s event should be emitted before `b`'s, given the sort order. */
function comesFirst(a: IotaEvent, b: IotaEvent, order: 'ascending' | 'descending'): boolean {
    return order === 'descending'
        ? eventTimestamp(a) >= eventTimestamp(b)
        : eventTimestamp(a) <= eventTimestamp(b);
}

export function useGetValidatorStakingEvents({
    validatorAddress,
    limit,
    order = 'descending',
}: UseGetValidatorStakingEventsOptions) {
    const client = useIotaClient();

    return useInfiniteQuery<StakingEventsPage>({
        queryKey: ['validator-staking-events', validatorAddress, limit, order],
        queryFn: async ({ pageParam }) => {
            const currentPageParam = pageParam as StakingEventsPageParam;
            const stakeState: EventStreamState = {
                ...currentPageParam.stake,
                buffer: [...currentPageParam.stake.buffer],
            };
            const unstakeState: EventStreamState = {
                ...currentPageParam.unstake,
                buffer: [...currentPageParam.unstake.buffer],
            };

            let remainingFetchBudget = MAX_RAW_FETCHES_PER_PAGE;

            async function fillBuffer(eventType: string, state: EventStreamState) {
                while (state.buffer.length === 0 && state.hasNextPage && remainingFetchBudget > 0) {
                    remainingFetchBudget -= 1;
                    const response = await client.queryEvents({
                        query: { MoveEventType: eventType },
                        cursor: state.cursor,
                        limit: RAW_QUERY_LIMIT,
                        order,
                    });

                    for (const event of response.data as IotaEvent[]) {
                        if (matchesValidator(event, validatorAddress!)) {
                            state.buffer.push(event);
                        }
                    }
                    state.cursor = response.nextCursor ?? null;
                    state.hasNextPage = response.hasNextPage;
                }
            }

            const merged: IotaEvent[] = [];
            while (merged.length < limit) {
                await Promise.all([
                    fillBuffer(STAKING_REQUEST_EVENT, stakeState),
                    fillBuffer(UNSTAKING_REQUEST_EVENT, unstakeState),
                ]);

                const stakeHead = stakeState.buffer[0];
                const unstakeHead = unstakeState.buffer[0];

                if (!stakeHead && !unstakeHead) {
                    break;
                }

                const takeStake =
                    !!stakeHead && (!unstakeHead || comesFirst(stakeHead, unstakeHead, order));
                merged.push(takeStake ? stakeState.buffer.shift()! : unstakeState.buffer.shift()!);

                if (remainingFetchBudget <= 0) {
                    break;
                }
            }

            return {
                data: merged,
                nextCursor: { stake: stakeState, unstake: unstakeState },
                hasNextPage:
                    stakeState.hasNextPage ||
                    unstakeState.hasNextPage ||
                    stakeState.buffer.length > 0 ||
                    unstakeState.buffer.length > 0,
            };
        },
        initialPageParam: INITIAL_PAGE_PARAM,
        getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
        enabled: !!validatorAddress && !!limit,
    });
}
