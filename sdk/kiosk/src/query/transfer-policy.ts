// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaClient, ObjectOwner } from '@iota/iota-sdk/client';
import { fromBase64, isValidIotaAddress } from '@iota/iota-sdk/utils';

import '../bcs.js';

import { TransferPolicyType } from '../bcs.js';
import type { TransferPolicy, TransferPolicyCap } from '../types/index.js';
import {
    TRANSFER_POLICY_CAP_TYPE,
    TRANSFER_POLICY_CREATED_EVENT,
    TRANSFER_POLICY_TYPE,
} from '../types/index.js';
import { getAllOwnedObjects, parseTransferPolicyCapObject } from '../utils.js';
import type { IotaGraphQLClient } from '@iota/iota-sdk/graphql';
import type { GraphQLOwner } from './queries.js';
import { TRANSFER_POLICY_QUERY } from './queries.js';

/**
 * Searches the `TransferPolicy`-s for the given type. The search is performed via
 * the `TransferPolicyCreated` event. The policy can either be owned or shared,
 * and the caller needs to filter the results accordingly (ie single owner can not
 * be accessed by anyone but the owner).
 *
 * @param provider
 * @param type
 */
export async function queryTransferPolicyByEvents(
    client: IotaClient,
    type: string,
): Promise<TransferPolicy[]> {
    const { data } = await client.queryEvents({
        query: {
            MoveEventType: `${TRANSFER_POLICY_CREATED_EVENT}<${type}>`,
        },
    });

    const search = data.map((event) => event.parsedJson as { id: string });
    const policies = await client.multiGetObjects({
        ids: search.map((policy) => policy.id),
        options: { showBcs: true, showOwner: true },
    });

    return policies
        .filter((policy) => !!policy && 'data' in policy)
        .map(({ data: policy }) => {
            // should never happen; policies are objects and fetched via an event.
            // policies are filtered for null and undefined above.
            if (!policy || !policy.bcs || !('bcsBytes' in policy.bcs)) {
                throw new Error(
                    `Invalid policy: ${policy?.objectId}, expected object, got package`,
                );
            }

            const parsed = TransferPolicyType.parse(fromBase64(policy.bcs.bcsBytes));

            return {
                id: policy?.objectId,
                type: `${TRANSFER_POLICY_TYPE}<${type}>`,
                owner: policy?.owner,
                rules: parsed.rules,
                balance: parsed.balance,
            } as TransferPolicy;
        });
}

export async function queryTransferPolicy(
    graphQlClient: IotaGraphQLClient,
    itemType: string,
): Promise<TransferPolicy[]> {
    const type = `${TRANSFER_POLICY_TYPE}<${itemType}>`;
    const { data, errors } = await graphQlClient.query({
        query: TRANSFER_POLICY_QUERY,
        variables: {
            filter: { type },
        },
    });

    if (errors?.length) {
        throw new Error(errors.map((error) => error.message).join('\n'));
    }

    return (
        data?.objects.nodes?.map(({ address: id, asMoveObject, owner }) => {
            const bcs = asMoveObject?.contents?.bcs;

            if (!asMoveObject || !bcs) {
                throw new Error(`Invalid policy: ${id}, expected object, got package`);
            }

            const parsed = TransferPolicyType.parse(fromBase64(bcs));

            return {
                id,
                type,
                owner: parseGraphqlObjectOwner(owner),
                rules: parsed.rules,
                balance: parsed.balance,
            };
        }) ?? []
    );
}

/**
 * A function to fetch all the user's kiosk Caps
 * And a list of the kiosk address ids.
 * Returns a list of `kioskOwnerCapIds` and `kioskIds`.
 * Extra options allow pagination.
 * @returns TransferPolicyCap Object ID | undefined if not found.
 */
export async function queryTransferPolicyCapsByType(
    client: IotaClient,
    address: string,
    type: string,
): Promise<TransferPolicyCap[]> {
    if (!isValidIotaAddress(address)) return [];

    const filter = {
        MatchAll: [
            {
                StructType: `${TRANSFER_POLICY_CAP_TYPE}<${type}>`,
            },
        ],
    };

    // fetch owned kiosk caps, paginated.
    const data = await getAllOwnedObjects({
        client,
        filter,
        owner: address,
    });

    return data
        .map((item) => parseTransferPolicyCapObject(item))
        .filter((item) => !!item) as TransferPolicyCap[];
}

/**
 * A function to fetch all the user's kiosk Caps
 * And a list of the kiosk address ids.
 * Returns a list of `kioskOwnerCapIds` and `kioskIds`.
 * Extra options allow pagination.
 * @returns TransferPolicyCap Object ID | undefined if not found.
 */
export async function queryOwnedTransferPolicies(
    client: IotaClient,
    address: string,
): Promise<TransferPolicyCap[] | undefined> {
    if (!isValidIotaAddress(address)) return;

    const filter = {
        MatchAll: [
            {
                MoveModule: {
                    module: 'transfer_policy',
                    package: '0x2',
                },
            },
        ],
    };

    // fetch all owned kiosk caps, paginated.
    const data = await getAllOwnedObjects({ client, owner: address, filter });

    const policies: TransferPolicyCap[] = [];

    for (const item of data) {
        const data = parseTransferPolicyCapObject(item);
        if (data) policies.push(data);
    }

    return policies;
}

function parseGraphqlObjectOwner(owner: GraphQLOwner): ObjectOwner {
    switch (owner?.__typename) {
        case 'AddressOwner':
            if (owner.owner) return { AddressOwner: owner.owner.address };
            break;
        case 'Parent':
            if (owner.parent) return { ObjectOwner: owner.parent.address };
            break;
        case 'Shared':
            return {
                Shared: { initial_shared_version: String(owner.initialSharedVersion) },
            };
        case 'Immutable':
            return 'Immutable';
    }

    throw new Error(`Missing owner or invalid owner type`);
}
