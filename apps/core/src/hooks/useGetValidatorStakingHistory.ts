// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import { type EventId } from '@iota/iota-sdk/client';
import { useQuery } from '@tanstack/react-query';
import {
    QUERY_MAX_RESULT_LIMIT,
    VALIDATORS_EVENTS_QUERY,
    type ValidatorEpochInfoEvent,
} from './useGetValidatorsEvents';

// Safety cap on the number of pages fetched, to avoid unbounded requests in case
// a validator address can't be found within the queried events.
const MAX_PAGES = 100;

interface GetValidatorStakingHistory {
    validatorAddress?: string;
    numberOfEpochs?: number;
}

export function useGetValidatorStakingHistory({
    validatorAddress,
    numberOfEpochs = 30,
}: GetValidatorStakingHistory) {
    const client = useIotaClient();
    return useQuery({
        queryKey: ['validatorStakingHistory', validatorAddress, numberOfEpochs],
        queryFn: async () => {
            const matches: ValidatorEpochInfoEvent[] = [];
            let hasNextPage = true;
            let currCursor: EventId | null | undefined;
            let page = 0;
            let latestEpoch: number | undefined;
            let reachedCutoff = false;

            while (
                hasNextPage &&
                matches.length < numberOfEpochs &&
                page < MAX_PAGES &&
                !reachedCutoff
            ) {
                const validatorEventsResponse = await client.queryEvents({
                    query: { MoveEventType: VALIDATORS_EVENTS_QUERY },
                    cursor: currCursor,
                    limit: QUERY_MAX_RESULT_LIMIT,
                    order: 'descending',
                });

                for (const event of validatorEventsResponse.data) {
                    const parsedEvent = event.parsedJson as ValidatorEpochInfoEvent;
                    const eventEpoch = Number(parsedEvent.epoch);

                    if (latestEpoch === undefined) {
                        latestEpoch = eventEpoch;
                    }

                    if (eventEpoch < latestEpoch - numberOfEpochs) {
                        reachedCutoff = true;
                        break;
                    }

                    if (parsedEvent.validator_address === validatorAddress) {
                        matches.push(parsedEvent);
                    }
                }

                hasNextPage = validatorEventsResponse.hasNextPage;
                currCursor = validatorEventsResponse.nextCursor;
                page++;
            }

            return matches.slice(0, numberOfEpochs).reverse();
        },
        enabled: !!validatorAddress,
        staleTime: 5 * 60 * 1000,
    });
}
