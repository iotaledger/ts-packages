// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { useIotaClient, useIotaClientQuery } from '@iota/dapp-kit';
import { getValidatorsMetadata } from '../../utils';
import type { IotaValidatorSummaryExtended } from '../../types';

export function useGetInactiveValidator(validatorAddress: string) {
    const iotaClient = useIotaClient();
    const { data: systemState } = useIotaClientQuery('getLatestIotaSystemState');
    const inactivePoolsId = systemState?.inactivePoolsId;
    const inactivePoolsSize = Number(systemState?.inactivePoolsSize ?? 0);
    return useQuery({
        queryKey: ['inactive-validators', inactivePoolsId],
        async queryFn() {
            if (!inactivePoolsId) {
                throw Error('Missing inactivePoolsId');
            }
            const inactiveValidators = await iotaClient.getDynamicFields({
                parentId: normalizeIotaAddress(inactivePoolsId),
            });

            const allInactive = await Promise.allSettled(
                inactiveValidators.data.map((validator) =>
                    getValidatorsMetadata(iotaClient, validator.objectId),
                ),
            );
            return allInactive
                .filter(
                    (r): r is PromiseFulfilledResult<IotaValidatorSummaryExtended | null> =>
                        r.status === 'fulfilled',
                )
                .map((r) => r.value)
                .filter((v): v is IotaValidatorSummaryExtended => v !== null);
        },
        select(data) {
            return data.find((v) => v?.iotaAddress === validatorAddress) ?? null;
        },
        enabled: !!inactivePoolsId && inactivePoolsSize > 0,
    });
}
