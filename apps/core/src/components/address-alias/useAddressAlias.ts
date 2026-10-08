// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { trimOrFormatAddress } from '@iota/iota-sdk/utils';
import { useAddressAliasLookup } from '../../hooks';

interface UseAddressAliasOptions {
    address: string;
    noTruncate?: boolean;
    truncateUnknown?: boolean;
}

export function useAddressAlias({
    address,
    noTruncate = false,
    truncateUnknown = false,
}: UseAddressAliasOptions) {
    const getAddressAlias = useAddressAliasLookup();
    const addressAlias = getAddressAlias(address);

    const addressToDisplay =
        noTruncate || !truncateUnknown ? address : trimOrFormatAddress(address);

    return { addressAlias, addressToDisplay };
}
