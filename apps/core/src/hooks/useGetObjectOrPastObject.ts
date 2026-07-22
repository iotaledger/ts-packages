// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import { isValidIotaObjectId, normalizeIotaObjectId } from '@iota/iota-sdk/utils';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
    IotaClient,
    type IotaObjectData,
    type IotaObjectResponse,
    type TransactionBlockData,
} from '@iota/iota-sdk/client';

const DEFAULT_GET_OBJECT_OPTIONS = {
    showType: true,
    showContent: true,
    showOwner: true,
    showPreviousTransaction: true,
    showStorageRebate: true,
    showDisplay: true,
};

export interface UseGetObjectOrPastObject extends IotaObjectResponse {
    isViewingPastVersion?: boolean | IotaObjectData | null;
    // The object existed but was deleted, and the transaction that last touched
    // it is beyond the indexer retention period, so no past version can be recovered.
    isHistoryUnavailable?: boolean;
}

const extractPreviousVersionFromTxData = (
    txData: TransactionBlockData | undefined,
    targetObjectId: string,
): number | null => {
    if (txData?.transaction?.kind !== 'ProgrammableTransaction') {
        return null;
    }

    for (const input of txData.transaction.inputs) {
        const isMatchingObjectInput =
            input.type === 'object' &&
            // Only works for immOrOwnedObject and receiving object types
            (input.objectType === 'immOrOwnedObject' || input.objectType === 'receiving') &&
            input.objectId === targetObjectId;

        if (isMatchingObjectInput) {
            return Number(input.version);
        }
    }

    for (const paymentObject of txData.gasData.payment) {
        if (paymentObject.objectId === targetObjectId) {
            return Number(paymentObject.version);
        }
    }

    return null;
};

const findPreviousObjectVersion = async (
    client: IotaClient,
    objectId: string,
): Promise<{ hasRecentTransactions: boolean; version: number | null }> => {
    const txsWithObjectInput = await client.queryTransactionBlocks({
        filter: { InputObject: objectId },
        order: 'descending',
        options: { showInput: true },
        limit: 1,
    });

    if (!txsWithObjectInput?.data.length) {
        return { hasRecentTransactions: false, version: null };
    }

    return {
        hasRecentTransactions: true,
        version: extractPreviousVersionFromTxData(
            txsWithObjectInput.data[0].transaction?.data,
            objectId,
        ),
    };
};

export async function fetchObjectOrPastObject(
    client: IotaClient,
    objectId?: string,
): Promise<UseGetObjectOrPastObject | null> {
    if (!objectId) return null;

    const normalizedObjId = normalizeIotaObjectId(objectId);
    if (!isValidIotaObjectId(normalizedObjId)) return null;

    const getObjectResponse = await client.getObject({
        id: normalizedObjId,
        options: DEFAULT_GET_OBJECT_OPTIONS,
    });

    const shouldTryFindPastVersion =
        getObjectResponse?.error?.code === 'notExists' ||
        getObjectResponse?.error?.code === 'deleted';

    if (!shouldTryFindPastVersion) {
        return { ...getObjectResponse, isViewingPastVersion: false };
    }

    const { hasRecentTransactions, version } = await findPreviousObjectVersion(
        client,
        normalizedObjId,
    );

    if (version === null) {
        // A deleted object with no transaction found via the InputObject filter
        // means its history lies beyond the indexer retention period.
        if (!hasRecentTransactions && getObjectResponse.error?.code === 'deleted') {
            return { error: getObjectResponse.error, isHistoryUnavailable: true };
        }
        return { error: { code: 'display', error: 'Object version not found' } };
    }

    const pastObjectResponse = await client.tryGetPastObject({
        id: normalizedObjId,
        version,
        options: DEFAULT_GET_OBJECT_OPTIONS,
    });

    if (pastObjectResponse?.status === 'VersionFound') {
        return {
            data: pastObjectResponse.details,
            isViewingPastVersion: pastObjectResponse.details,
        };
    }

    return { error: { code: 'display', error: 'Object version not found' } };
}

export const getObjectOrPastObjectQuery = <TSelectData = UseGetObjectOrPastObject | null>(
    client: IotaClient,
    objectId?: string,
    select?: (data: UseGetObjectOrPastObject | null) => TSelectData,
) => {
    return {
        select,
        // eslint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['object-or-past-object', objectId],
        queryFn: () => fetchObjectOrPastObject(client, objectId),
        enabled: !!objectId,
    };
};

export function useGetObjectOrPastObject(
    objectId?: string,
): UseQueryResult<UseGetObjectOrPastObject | null> {
    const client = useIotaClient();
    return useQuery(getObjectOrPastObjectQuery(client, objectId));
}
