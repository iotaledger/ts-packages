// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaObjectResponse } from '@iota/iota-sdk/client';
import { normalizeIotaAddress, parseStructTag } from '@iota/iota-sdk/utils';

const AUTHENTICATOR_MODULE = 'account';
const AUTHENTICATOR_KEY_STRUCT = 'AuthenticatorFunctionRefV1Key';

export const IOTA_FRAMEWORK_ADDRESS = normalizeIotaAddress('0x2');

// TODO: Add well-known system package addresses when official IOTA authenticators are shipped
const OFFICIAL_AUTHENTICATOR_PACKAGES = new Set<string>();

export function isOfficialAuthenticator(packageId: string | null): boolean {
    if (!packageId) return false;
    return OFFICIAL_AUTHENTICATOR_PACKAGES.has(packageId);
}

export type AuthenticatorReference = {
    packageId: string | null;
    moduleName: string | null;
    functionName: string | null;
    target: string | null;
};

export function isAuthenticatorFunctionRefV1Key(type?: string | null): boolean {
    if (!type) return false;

    try {
        const { address, module, name } = parseStructTag(type);
        return (
            normalizeIotaAddress(address) === IOTA_FRAMEWORK_ADDRESS &&
            module === AUTHENTICATOR_MODULE &&
            name === AUTHENTICATOR_KEY_STRUCT
        );
    } catch {
        return false;
    }
}

export function normalizeAccountId(accountId?: string | null): string | null {
    if (!accountId) return null;

    try {
        return normalizeIotaAddress(accountId);
    } catch {
        return null;
    }
}

export function extractAuthenticatorRef(
    data: IotaObjectResponse | undefined,
): AuthenticatorReference | null {
    const content = data?.data?.content;
    if (!content || content.dataType !== 'moveObject') return null;

    const fields = content.fields as Record<string, unknown>;
    const rawValue = fields?.value as Record<string, unknown>;
    const value = (rawValue?.fields ?? rawValue) as Record<string, unknown>;

    if (!value) return null;

    const packageId =
        typeof value.package === 'string' ? normalizeIotaAddress(value.package) : null;
    const moduleName = typeof value.module_name === 'string' ? value.module_name : null;
    const functionName = typeof value.function_name === 'string' ? value.function_name : null;

    if (!packageId && !moduleName && !functionName) return null;

    return {
        packageId,
        moduleName,
        functionName,
        target:
            packageId && moduleName && functionName
                ? `${packageId}::${moduleName}::${functionName}`
                : null,
    };
}
