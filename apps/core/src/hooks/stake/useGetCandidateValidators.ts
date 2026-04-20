// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient, useIotaClientQuery } from '@iota/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { getValidatorsMetadata } from '../../utils';
import type { IotaValidatorSummaryExtended } from '../../types';

interface CandidateValidatorsResult<T> {
    data: T;
    isPending: boolean;
    isLoading: boolean;
    isError: boolean;
}

export function useGetCandidateValidators(
    validatorAddress: string,
): CandidateValidatorsResult<(IotaValidatorSummaryExtended & { isCandidate: true }) | null>;
export function useGetCandidateValidators(): CandidateValidatorsResult<
    (IotaValidatorSummaryExtended & { isCandidate: true })[]
>;
export function useGetCandidateValidators(validatorAddress?: string) {
    const iotaClient = useIotaClient();
    const { data: systemState } = useIotaClientQuery('getLatestIotaSystemState');
    const validatorCandidatesId = systemState?.validatorCandidatesId;

    const { data, isPending, isLoading, isError } = useQuery({
        queryKey: ['candidate-validators', validatorCandidatesId],
        async queryFn() {
            if (!validatorCandidatesId) {
                throw Error('Missing validatorCandidatesId');
            }
            const candidateEntries = await iotaClient.getDynamicFields({
                parentId: normalizeIotaAddress(validatorCandidatesId),
            });
            const candidateValidators = await Promise.all(
                candidateEntries.data.map((entry) =>
                    getValidatorsMetadata(iotaClient, entry.objectId),
                ),
            );
            return candidateValidators.filter(
                (v): v is IotaValidatorSummaryExtended => v !== null,
            );
        },
        enabled: !!validatorCandidatesId,
        select(candidateValidators) {
            const candidates = candidateValidators.map((v) => ({ ...v, isCandidate: true as const }));
            return validatorAddress
                ? (candidates.find((v) => v.iotaAddress === validatorAddress) ?? null)
                : candidates;
        },
    });

    return {
        data,
        isPending,
        isLoading,
        isError,
    };
}
