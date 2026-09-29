// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getSubnameRegistrationType, isSubname, normalizeIotaName } from '@iota/iota-names-sdk';
import { useQuery } from '@tanstack/react-query';

import { useGetDefaultIotaName } from './useGetDefaultIotaName.js';
import { useIotaClient } from './useIotaClient.js';
import { useIotaNamesClient } from './useIotaNamesClient.js';

export function useGetIotaNameAvatar(
    address: string | null | undefined,
    iotaNamesEnabled: boolean,
) {
    const client = useIotaClient();
    const { iotaNamesClient, networkId, isSupported } = useIotaNamesClient();
    const { data: name } = useGetDefaultIotaName(address, iotaNamesEnabled);

    return useQuery({
        // eslint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['iota-name', 'avatar', name, networkId],
        queryFn: async () => {
            if (!name || !address || !iotaNamesClient) return null;

            const nameRecord = await iotaNamesClient.getNameRecord(name);
            if (!nameRecord) return null;

            const avatarObjectId =
                nameRecord.avatar ??
                (isSubname(name) ? await findSubnameNftId() : nameRecord.nftId);
            if (!avatarObjectId) return null;

            const objectResponse = await client.getObject({
                id: avatarObjectId,
                options: { showDisplay: true },
            });

            return objectResponse?.data?.display?.data?.image_url ?? null;

            async function findSubnameNftId() {
                let subnameType: string;
                try {
                    subnameType = getSubnameRegistrationType(
                        iotaNamesClient!.getPackage('packageId', 'v1'),
                    );
                } catch {
                    return null;
                }

                const { data } = await client.getOwnedObjects({
                    owner: address!,
                    filter: { StructType: subnameType },
                    options: { showDisplay: true },
                });

                return (
                    data.find((object) => {
                        try {
                            return (
                                normalizeIotaName(object.data?.display?.data?.name ?? '') === name
                            );
                        } catch {
                            return false;
                        }
                    })?.data?.objectId ?? null
                );
            }
        },
        enabled: iotaNamesEnabled && isSupported && !!name && !!address,
        staleTime: 1000 * 60 * 5,
    });
}
