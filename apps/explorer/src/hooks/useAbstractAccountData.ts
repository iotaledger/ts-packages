// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    type AuthenticatorReference,
    extractAuthenticatorRef,
    isAuthenticatorFunctionRefV1Key,
    normalizeAccountId,
} from './abstractAccount.utils';

type AbstractAccountAuthenticator = AuthenticatorReference & {
    label: string | null;
};

type UseAbstractAccountDataResult = {
    isAbstractAccount: boolean;
    authenticator: AbstractAccountAuthenticator | null;
    isPending: boolean;
    isError: boolean;
};

const MAX_DYNAMIC_FIELDS_PAGE_SIZE = 10;

const objectOptions = {
    showType: true,
    showContent: true,
    showOwner: true,
    showPreviousTransaction: true,
    showStorageRebate: true,
    showDisplay: true,
};

export function useAbstractAccountData(accountId?: string | null): UseAbstractAccountDataResult {
    const client = useIotaClient();
    const parentObjectId = useMemo(() => normalizeAccountId(accountId), [accountId]);

    const { data, isPending, isError } = useQuery({
        queryKey: ['abstract-account-data', parentObjectId],
        queryFn: async (): Promise<
            Pick<UseAbstractAccountDataResult, 'isAbstractAccount' | 'authenticator'>
        > => {
            const dynamicFieldsData = await client.getDynamicFields({
                parentId: parentObjectId!,
                cursor: null,
                limit: MAX_DYNAMIC_FIELDS_PAGE_SIZE,
            });

            // Only the first loaded page is searched; accounts with many dynamic fields may need pagination.
            const authenticatorField =
                dynamicFieldsData.data.find((field) =>
                    isAuthenticatorFunctionRefV1Key(field.name.type),
                ) ?? null;

            if (!authenticatorField) {
                return {
                    isAbstractAccount: false,
                    authenticator: null,
                };
            }

            const authenticatorFieldData = await client.getObject({
                id: authenticatorField.objectId,
                options: objectOptions,
            });

            const reference = extractAuthenticatorRef(authenticatorFieldData);
            return {
                isAbstractAccount: true,
                authenticator: reference ? { ...reference, label: reference.target } : null,
            };
        },
        enabled: !!parentObjectId,
    });

    return {
        isAbstractAccount: data?.isAbstractAccount ?? false,
        authenticator: data?.authenticator ?? null,
        isPending,
        isError,
    };
}
