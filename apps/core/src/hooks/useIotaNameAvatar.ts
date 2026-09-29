// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClientQuery } from '@iota/dapp-kit';
import { getSubnameRegistrationType, isSubname, normalizeIotaName } from '@iota/iota-names-sdk';
import { useIotaNamesClient } from '../contexts';
import { useGetAllOwnedObjects } from './useGetAllOwnedObjects';
import { useGetDefaultIotaName } from './useGetDefaultIotaName';
import { useGetIotaNameRecord } from './useGetIotaNameRecord';

interface UseIotaNameAvatarResult {
    name: string | null | undefined;
    imageUrl: string | undefined;
    isLoading: boolean;
}

function getSubnameType(iotaNamesClient: ReturnType<typeof useIotaNamesClient>['iotaNamesClient']) {
    try {
        const packageId = iotaNamesClient?.getPackage('packageId', 'v1');
        return packageId ? getSubnameRegistrationType(packageId) : undefined;
    } catch {
        return undefined;
    }
}

export function useIotaNameAvatar(
    address: string | null | undefined,
    enabled: boolean = true,
): UseIotaNameAvatarResult {
    const { iotaNamesClient } = useIotaNamesClient();

    const isEnabled = enabled && !!iotaNamesClient?.config && !!address;

    const { data: name, isLoading: isLoadingName } = useGetDefaultIotaName(
        isEnabled ? address : undefined,
    );
    const { data: record, isLoading: isLoadingNameRecord } = useGetIotaNameRecord(name);

    const isNameSubname = !!name && isSubname(name);
    const subnameType = isNameSubname ? getSubnameType(iotaNamesClient) : undefined;

    const { data: ownedSubnames, isLoading: isLoadingOwnedSubnames } = useGetAllOwnedObjects(
        subnameType ? (address ?? '') : '',
        subnameType ? { StructType: subnameType } : undefined,
    );

    const subnameNftId =
        name && ownedSubnames
            ? ownedSubnames.find((object) => {
                  try {
                      return normalizeIotaName(object.display?.data?.name ?? '') === name;
                  } catch {
                      return false;
                  }
              })?.objectId
            : undefined;

    const avatarObjectId = record?.avatar ?? (isNameSubname ? subnameNftId : record?.nftId);

    const { data: avatarObject, isLoading: isLoadingAvatarObject } = useIotaClientQuery(
        'getObject',
        { id: avatarObjectId!, options: { showDisplay: true } },
        { enabled: !!avatarObjectId },
    );

    return {
        name,
        imageUrl: avatarObject?.data?.display?.data?.image_url ?? undefined,
        isLoading:
            isEnabled &&
            (isLoadingName ||
                isLoadingNameRecord ||
                (!!subnameType && isLoadingOwnedSubnames) ||
                (!!avatarObjectId && isLoadingAvatarObject)),
    };
}
