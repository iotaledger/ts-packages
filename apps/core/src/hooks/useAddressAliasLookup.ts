// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Feature } from '../enums';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { useFeatureValue } from '@iota/apps-backend-client';
import { useIotaClientQuery } from '@iota/dapp-kit';

const ADDRESSES_ALIAS_FALLBACK: KnownAddressAliasesFeature = {
    enabled: false,
    addresses: {},
};

type AddressAliasValue = string | { name: string; imageUrl?: string };
type AddressAliases = Record<string, AddressAliasValue>;

type KnownAddressAliasesFeature = {
    enabled: boolean;
    addresses: AddressAliases;
};

export interface ResolvedAddressAlias {
    alias: string;
    imageUrl?: string;
}

export function useAddressAliasLookup() {
    const knownAddresses = useFeatureValue<KnownAddressAliasesFeature>(
        Feature.KnownAddressAlias,
        ADDRESSES_ALIAS_FALLBACK,
    );

    const { data: systemState } = useIotaClientQuery('getLatestIotaSystemState');

    const validatorsAddresses: Record<string, ResolvedAddressAlias> = Object.fromEntries(
        systemState?.activeValidators.map((validator) => [
            validator.iotaAddress,
            { alias: validator.name, imageUrl: validator.imageUrl },
        ]) ?? [],
    );

    const knownAddressAliases: Record<string, ResolvedAddressAlias> = Object.fromEntries(
        Object.entries(knownAddresses.addresses).map(([address, aliasValue]) => [
            address,
            typeof aliasValue === 'string'
                ? { alias: aliasValue }
                : { alias: aliasValue.name, imageUrl: aliasValue.imageUrl },
        ]),
    );

    const addressAliasMap: Record<string, ResolvedAddressAlias> = {
        ...validatorsAddresses,
        ...knownAddressAliases,
    };

    return (address: string): ResolvedAddressAlias | null => {
        if (!knownAddresses || !knownAddresses.enabled) {
            return null;
        }

        const normalized = normalizeIotaAddress(address);

        return addressAliasMap[normalized] ?? null;
    };
}
