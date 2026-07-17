// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useGetIotaNameRecord, useIotaNamesClient } from '@iota/core';
import { useIotaClientQuery } from '@iota/dapp-kit';
import { getNameRegistrationType, getSubnameRegistrationType } from '@iota/iota-names-sdk';
import { useMemo } from 'react';

interface UseIotaNameAvatarResult {
    imageUrl: string | undefined;
    isLoading: boolean;
}

export function useIotaNameAvatar(
    address: string | undefined,
    name: string | null | undefined,
): UseIotaNameAvatarResult {
    const { data: record, isLoading: isLoadingNameRecord } = useGetIotaNameRecord(name);

    const avatarObjectId = record?.avatar;

    const { data: avatarObjectResponse, isLoading: isLoadingAvatarObject } = useIotaClientQuery(
        'getObject',
        { id: avatarObjectId!, options: { showDisplay: true } },
        { enabled: !!avatarObjectId },
    );

    const avatarImageUrl = avatarObjectResponse?.data?.display?.data?.image_url;

    const { iotaNamesClient } = useIotaNamesClient();

    const nameTypes = useMemo(() => {
        try {
            const packageId = iotaNamesClient?.getPackage('packageId', 'v1');
            if (!packageId) return [];
            return [getNameRegistrationType(packageId), getSubnameRegistrationType(packageId)];
        } catch {
            // IOTA Names packages are not available on all networks (e.g. localnet)
            return [];
        }
    }, [iotaNamesClient]);

    const { data: ownedNameNfts, isLoading: isLoadingOwnedNameNfts } = useIotaClientQuery(
        'getOwnedObjects',
        {
            owner: address!,
            filter: { MatchAny: nameTypes.map((type) => ({ StructType: type })) },
            options: { showDisplay: true },
        },
        { enabled: !!address && nameTypes.length > 0 },
    );

    const ownedNameNftImageUrl = ownedNameNfts?.data?.find(
        (object) => object.data?.display?.data?.image_url,
    )?.data?.display?.data?.image_url;

    const imageUrl = avatarImageUrl ?? ownedNameNftImageUrl;

    return {
        imageUrl,
        isLoading:
            isLoadingNameRecord ||
            (!!avatarObjectId && isLoadingAvatarObject) ||
            (!!address && nameTypes.length > 0 && isLoadingOwnedNameNfts),
    };
}
