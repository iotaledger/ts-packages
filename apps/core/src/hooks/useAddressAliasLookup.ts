// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Feature } from '../enums';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { useFeatureValue } from '@iota/apps-backend-client';
import { useIotaClientQuery } from '@iota/dapp-kit';

export interface KnownAddress {
    name: string;
    logo?: string;
}

const ADDRESSES_ALIAS_FALLBACK: KnownAddressAliasesFeature = {
    enabled: false,
    addresses: {},
};

type AddressAliases = Record<string, KnownAddress>;

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
        Object.entries(knownAddresses.addresses).map(([address, knownAddress]) => [
            address,
            { alias: knownAddress.name, imageUrl: knownAddress.logo },
        ]),
    );

    const addressAliasMap: Record<string, ResolvedAddressAlias> = {
        ...knownAddressAliases,
        ...validatorsAddresses,
    };

    return (address: string): ResolvedAddressAlias | null => {
        if (!knownAddresses || !knownAddresses.enabled) {
            return null;
        }

        const normalized = normalizeIotaAddress(address);

        return addressAliasMap[normalized] ?? null;
    };
}
