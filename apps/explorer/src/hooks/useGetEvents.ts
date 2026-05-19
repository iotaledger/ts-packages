// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query';
import { type IotaEvent, type EventId } from '@iota/iota-sdk/client';
import { useIotaClient } from '@iota/dapp-kit';

type UseGetEventsProps = {
    eventType: string;
    objectId: string; // Optional objectId for more specific queries
    limit?: number | null;
    order?: 'ascending' | 'descending';
};

const QUERY_MAX_RESULT_LIMIT = 50;

/**
 * A generic hook to query for Move events from the IOTA network.
 */
export function useGetEvents({ eventType, objectId, limit, order }: UseGetEventsProps) {
    const client = useIotaClient();

    // The query key will include all parameters to ensure uniqueness
    const queryKey = ['events', eventType, objectId, limit, order];

    return useQuery<IotaEvent[], Error>({
        queryKey,
        queryFn: async () => {
            if (!limit) {
                // Do some validation at the runtime level for some extra type-safety
                // https://tkdodo.eu/blog/react-query-and-type-script#type-safety-with-the-enabled-option
                throw new Error(
                    `Limit needs to always be defined and non-zero! Received ${limit} instead.`,
                );
            }

            if (!eventType) {
                // Return empty array if eventType is not provided
                return [];
            }

            // The full event type name might need to be constructed based on the package, module, and event name.
            // For now, we'll assume eventType is the full name.
            // Example for audit trail: '0xabcde...::audit_trail::CapabilityIssued'
            // const fullEventType = eventType;

            const results: IotaEvent[] = [];
            let currCursor: EventId | null | undefined;
            let hasNextPage = true;

            // Handle pagination similar to useGetValidatorsEvents
            while (hasNextPage && results.length < limit) {
                const response = await client.queryEvents({
                    query: {
                        // Event Filter not supported
                        MoveEventField: {
                            path: '/parsedJson',
                            value: null,
                        },
                    },
                    // query: {
                    //     MoveEventType: fullEventType,
                    // },
                    // query: {
                    //     And: [
                    //         { MoveEventType: fullEventType },
                    //         {
                    //             MoveEventField: {
                    //                 path: 'parsedJson.target_key',
                    //                 value: objectId,
                    //             },
                    //         },
                    //     ],
                    // },
                    cursor: currCursor,
                    limit: Math.min(limit, QUERY_MAX_RESULT_LIMIT),
                    order,
                });

                results.push(...(response.data as IotaEvent[]));
                hasNextPage = response.hasNextPage;
                currCursor = response.nextCursor;
            }

            return results.slice(0, limit);
        },
        enabled: !!client && !!eventType, // The query will not run until the client and eventType are available
    });
}
