// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useGetDynamicFields, useGetObject } from '@iota/core';
import { useMemo } from 'react';
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

export function useAbstractAccountData(accountId?: string | null): UseAbstractAccountDataResult {
    const parentObjectId = useMemo(() => normalizeAccountId(accountId), [accountId]);

    const {
        data: dynamicFieldsData,
        isPending: isDynamicFieldsPending,
        isError: isDynamicFieldsError,
    } = useGetDynamicFields(parentObjectId ?? '');

    // Only the first loaded page is searched; accounts with many dynamic fields may need pagination.
    const dynamicFields = dynamicFieldsData?.pages.flatMap((p) => p.data) ?? [];

    const authenticatorField = useMemo(
        () =>
            dynamicFields.find((field) => isAuthenticatorFunctionRefV1Key(field.name.type)) ?? null,
        [dynamicFields],
    );

    const {
        data: authenticatorFieldData,
        isPending: isAuthenticatorPending,
        isError: isAuthenticatorError,
    } = useGetObject(authenticatorField?.objectId);

    const authenticator = useMemo(() => {
        const reference = extractAuthenticatorRef(authenticatorFieldData);
        if (!reference) return null;
        return { ...reference, label: reference.target };
    }, [authenticatorFieldData]);

    return {
        isAbstractAccount: !!authenticatorField,
        authenticator,
        isPending: isDynamicFieldsPending || (!!authenticatorField && isAuthenticatorPending),
        isError: isDynamicFieldsError || isAuthenticatorError,
    };
}
