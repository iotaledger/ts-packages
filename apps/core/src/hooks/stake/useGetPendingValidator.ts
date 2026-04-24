// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { useIotaClient, useIotaClientQuery } from '@iota/dapp-kit';
import { getValidatorsMetadata } from '../../utils';
import type { IotaValidatorSummaryExtended } from '../../types';

export function useGetPendingValidator(validatorAddress: string) {
    const iotaClient = useIotaClient();
    const { data } = useIotaClientQuery('getLatestIotaSystemState');
    const pendingActiveValidatorsId = data?.pendingActiveValidatorsId;
    const pendingActiveValidatorsSize = Number(data?.pendingActiveValidatorsSize ?? 0);

    return useQuery({
        queryKey: ['pending-validators', pendingActiveValidatorsId],
        async queryFn() {
            if (!pendingActiveValidatorsId) {
                throw Error('Missing params');
            }
            const pendingValidators = await iotaClient.getDynamicFields({
                parentId: normalizeIotaAddress(pendingActiveValidatorsId),
            });

            const allPending = await Promise.allSettled(
                pendingValidators.data.map((validator) =>
                    getValidatorsMetadata(iotaClient, validator.objectId),
                ),
            );
            return allPending
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
        enabled: !!pendingActiveValidatorsId && pendingActiveValidatorsSize > 0,
    });
}
