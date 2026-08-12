// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { useIotaClientQuery } from '@iota/dapp-kit';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import type { IotaValidatorSummary } from '@iota/iota-sdk/client';

export function useValidatorByAddress(
    address: string | undefined,
): IotaValidatorSummary | null | undefined {
    const { data, isPending } = useIotaClientQuery('getLatestIotaSystemState');

    return useMemo(() => {
        if (!address) {
            return null;
        }

        if (isPending || !data) {
            return undefined;
        }

        const normalizedAddress = normalizeIotaAddress(address);
        return (
            data.activeValidators.find(
                ({ iotaAddress }) => normalizeIotaAddress(iotaAddress) === normalizedAddress,
            ) ?? null
        );
    }, [address, data, isPending]);
}
