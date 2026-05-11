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
} from '@iota/core';

type AbstractAccountAuthenticator = AuthenticatorReference & {
    label: string | null;
};

type UseAbstractAccountDataResult = {
    isAbstractAccount: boolean;
    authenticator: AbstractAccountAuthenticator | null;
    isPending: boolean;
    isError: boolean;
};

const objectOptions = {
    showContent: true,
};

export function useAbstractAccountData(accountId?: string | null): UseAbstractAccountDataResult {
    const client = useIotaClient();
    const parentObjectId = useMemo(() => normalizeAccountId(accountId), [accountId]);

    const { data, isPending, isError } = useQuery({
        queryKey: ['abstract-account-data', parentObjectId],
        queryFn: async (): Promise<
            Pick<UseAbstractAccountDataResult, 'isAbstractAccount' | 'authenticator'>
        > => {
            let cursor: string | null | undefined = null;
            let authenticatorField = null;

            do {
                const dynamicFieldsData = await client.getDynamicFields({
                    parentId: parentObjectId!,
                    cursor,
                });

                authenticatorField =
                    dynamicFieldsData.data.find((field) =>
                        isAuthenticatorFunctionRefV1Key(field.name.type),
                    ) ?? null;

                cursor = dynamicFieldsData.hasNextPage ? dynamicFieldsData.nextCursor : null;
            } while (!authenticatorField && cursor);

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
