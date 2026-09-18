// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Feature,
    fetchObjectOrPastObject,
    useIotaNamesClient,
    isAuthenticatorFunctionRefV1Key,
} from '@iota/core';
import { useIotaClient, useIotaClientQuery } from '@iota/dapp-kit';
import { type IotaNamesClient, isValidIotaName } from '@iota/iota-names-sdk';
import { type IotaClient, type LatestIotaSystemStateSummary } from '@iota/iota-sdk/client';
import {
    isValidTransactionDigest,
    isValidIotaAddress,
    isValidIotaObjectId,
    normalizeIotaObjectId,
} from '@iota/iota-sdk/utils';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { type IdentityClientReadOnly } from '@iota/identity-wasm/web';
import { useFeatureIsOn } from '@iota/apps-backend-client';
import { type NotarizationClientReadOnly } from '@iota/notarization/web';
import { tryDIDParse, tryEncodeDidToUrl } from '~/lib/utils/trust-framework/client';
import { useAuditTrailClient, useIdentityClient, useNotarizationClient } from '~/contexts';
import { type AuditTrailClientReadOnly } from '@iota/audit-trails/web';

const isGenesisLibAddress = (value: string): boolean => /^(0x|0X)0{0,39}[12]$/.test(value);

type Results = { id: string; label: string; type: string }[];

const getResultsForAuditTrail = async (
    auditTrailClient: AuditTrailClientReadOnly | null,
    isAuditTrailEnabled: boolean,
    query: string,
): Promise<Results | null> => {
    if (auditTrailClient == null) return null; // client not available
    if (!isAuditTrailEnabled) return null; // feature flag disabled

    const auditTrailChain = await auditTrailClient.trail(query).get();
    if (!auditTrailChain) return null;

    return [
        {
            id: `${auditTrailChain.id}-audittrail`,
            label: auditTrailChain.id,
            type: 'audit-trail',
        },
    ];
};

const getResultsForNotarization = async (
    notarizationClient: NotarizationClientReadOnly | null,
    isNotarizationEnabled: boolean,
    query: string,
): Promise<Results | null> => {
    if (notarizationClient == null) return null; // client not available
    if (!isNotarizationEnabled) return null; // feature flag disabled

    const notarizationChain = await notarizationClient.getNotarizationById(query);
    if (!notarizationChain) return null;

    return [
        {
            id: `${notarizationChain.id}-notarization`,
            label: notarizationChain.id,
            type: 'notarization',
        },
    ];
};

const getResultsForDid = async (
    identityClient: IdentityClientReadOnly | null,
    isIdentityEnabled: boolean,
    query: string,
): Promise<Results | null> => {
    if (identityClient == null) return null; // client not available
    if (!isIdentityEnabled) return null; // feature flag disabled

    let didDocument = null;
    const didParsed = await tryDIDParse(query);

    try {
        if (didParsed == null) {
            const identity = await identityClient.getIdentity(query);
            didDocument = identity.toFullFledged()?.didDocument();
        } else {
            didDocument = await identityClient.resolveDid(didParsed);
        }
    } catch {
        // DO NOTHING! We are not interested in this error because the consequence
        // for it to fail is only not show a selection option in the search result
    }

    if (didDocument == null) return null; // Nothing to show

    const didUrlEncoded = await tryEncodeDidToUrl(didDocument.id());
    if (didUrlEncoded == null) {
        throw new Error(
            'failed to encode a resolved DID to its URL representation, this should never happen!',
        );
    }

    return [
        {
            id: didUrlEncoded,
            label: didDocument.id().toString(),
            type: 'identity',
        },
    ];
};

const getResultsForTransaction = async (
    client: IotaClient,
    query: string,
): Promise<Results | null> => {
    if (!isValidTransactionDigest(query)) return null;
    const txdata = await client.getTransactionBlock({ digest: query });
    return [
        {
            id: txdata.digest,
            label: txdata.digest,
            type: 'transaction',
        },
    ];
};

const getResultsForObject = async (client: IotaClient, query: string): Promise<Results | null> => {
    try {
        const result = await fetchObjectOrPastObject(client, query);
        if (!result?.data?.objectId) return null;

        return [{ id: result.data.objectId, label: result.data.objectId, type: 'object' }];
    } catch {
        return null;
    }
};

const getResultsForCheckpoint = async (
    client: IotaClient,
    query: string,
): Promise<Results | null> => {
    // Check if query is a sequence number (numeric string)
    const isSequenceNumber = /^\d+$/.test(query);

    // Checkpoint digests have the same format as transaction digests:
    if (!isSequenceNumber && !isValidTransactionDigest(query)) return null;

    try {
        const checkpoint = await client.getCheckpoint({ id: query });
        if (!checkpoint?.digest) return null;

        return [
            {
                id: checkpoint.sequenceNumber,
                label: `Checkpoint ${checkpoint.sequenceNumber}`,
                type: 'checkpoint',
            },
        ];
    } catch (error) {
        return null;
    }
};

const getResultsForEpoch = async (client: IotaClient, query: string): Promise<Results | null> => {
    if (!/^\d+$/.test(query)) return null;

    try {
        const committeeInfo = await client.getCommitteeInfo({ epoch: query });
        if (!committeeInfo?.epoch || committeeInfo.epoch !== query) return null;

        return [
            {
                id: committeeInfo.epoch,
                label: `Epoch ${committeeInfo.epoch}`,
                type: 'epoch',
            },
        ];
    } catch (error) {
        return null;
    }
};

const getResultsForAddress = async (
    client: IotaClient,
    query: string,
    iotaNamesClient: IotaNamesClient | null,
): Promise<Results | null> => {
    if (iotaNamesClient && isValidIotaName(query)) {
        const nameRecord = await iotaNamesClient.getNameRecord(query.toLowerCase());

        if (!nameRecord || !nameRecord.targetAddress) return null;

        const [addrHasActivity, abstractAccountCheck] = await Promise.all([
            addressHasActivity(client, nameRecord.targetAddress),
            isAbstractAccount(client, nameRecord.targetAddress),
        ]);

        return [
            {
                id: nameRecord.targetAddress,
                label: nameRecord.targetAddress,
                type: abstractAccountCheck ? 'account' : addrHasActivity ? 'address' : 'object',
            },
        ];
    }

    const normalized = normalizeIotaObjectId(query);
    if (!isValidIotaAddress(normalized) || isGenesisLibAddress(normalized)) return null;

    const [fromOrTo, abstractAccountCheck] = await Promise.all([
        client.queryTransactionBlocks({
            filter: { FromOrToAddress: { addr: normalized } },
            limit: 1,
        }),
        isAbstractAccount(client, normalized),
    ]);

    // Note: we need to query owned objects separately
    // because genesis addresses might not be involved in any transaction yet.
    // AA accounts are shared objects so they won't appear in getOwnedObjects.
    let ownedObjects = [];
    if (!fromOrTo.data?.length && !abstractAccountCheck) {
        const response = await client.getOwnedObjects({ owner: normalized, limit: 1 });
        ownedObjects = response.data;
    }

    if (!fromOrTo.data?.length && !ownedObjects?.length && !abstractAccountCheck) return null;

    return [
        {
            id: normalized,
            label: normalized,
            type: abstractAccountCheck ? 'account' : 'address',
        },
    ];
};

async function isAbstractAccount(client: IotaClient, address: string): Promise<boolean> {
    try {
        const { data } = await client.getDynamicFields({ parentId: address });
        return data.some((field) => isAuthenticatorFunctionRefV1Key(field.name.type));
    } catch {
        return false;
    }
}

async function addressHasActivity(client: IotaClient, address: string): Promise<boolean> {
    const normalized = normalizeIotaObjectId(address);
    if (!isValidIotaAddress(normalized)) return false;
    try {
        const fromOrTo = await client.queryTransactionBlocks({
            filter: { FromOrToAddress: { addr: normalized } },
            limit: 1,
        });
        if (fromOrTo?.data?.length > 0) return true;

        const ownedObjects = await client.getOwnedObjects({
            owner: normalized,
            limit: 1,
        });
        if (ownedObjects.data.length > 0) return true;

        return false;
    } catch (e) {
        return false;
    }
}

// Query for validator by pool id or iota address.
const getResultsForValidatorByPoolIdOrIotaAddress = async (
    systemStateSummary: LatestIotaSystemStateSummary | null,
    query: string,
): Promise<Results | null> => {
    const normalized = normalizeIotaObjectId(query);
    if (
        (!isValidIotaAddress(normalized) && !isValidIotaObjectId(normalized)) ||
        !systemStateSummary
    )
        return null;

    // find validator by pool id or iota address
    const validator = systemStateSummary.activeValidators?.find(
        ({ stakingPoolId, iotaAddress }) => stakingPoolId === normalized || iotaAddress === query,
    );

    if (!validator) return null;

    return [
        {
            id: validator.iotaAddress || validator.stakingPoolId,
            label: normalized,
            type: 'validator',
        },
    ];
};

export function useSearch(query: string): UseQueryResult<Results, Error> {
    const client = useIotaClient();
    const identityClient = useIdentityClient();
    const notarizationClient = useNotarizationClient();
    const auditTrailClient = useAuditTrailClient();
    const { data: systemStateSummary } = useIotaClientQuery('getLatestIotaSystemState');

    const isTFIdentityEnabled = useFeatureIsOn(Feature.ExplorerTFIdentity as string);
    const isTFNotarizationEnabled = useFeatureIsOn(Feature.ExplorerTFNotarization as string);
    const isTFAuditTrailEnabled = useFeatureIsOn(Feature.ExplorerTFAuditTrail as string);
    const { iotaNamesClient } = useIotaNamesClient();

    return useQuery<Results, Error>({
        // eslint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['search', query],
        queryFn: async () => {
            const results = (
                await Promise.allSettled([
                    getResultsForTransaction(client, query),
                    getResultsForCheckpoint(client, query),
                    getResultsForEpoch(client, query),
                    getResultsForAddress(client, query, iotaNamesClient),
                    getResultsForDid(identityClient, isTFIdentityEnabled, query),
                    getResultsForNotarization(notarizationClient, isTFNotarizationEnabled, query),
                    getResultsForAuditTrail(auditTrailClient, isTFAuditTrailEnabled, query),
                    getResultsForObject(client, query),
                    getResultsForValidatorByPoolIdOrIotaAddress(systemStateSummary || null, query),
                ])
            ).filter(
                (r) => r.status === 'fulfilled' && r.value,
            ) as PromiseFulfilledResult<Results>[];

            return results.map(({ value }) => value).flat();
        },
        enabled: !!query,
        gcTime: 10000,
    });
}
