// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type OnChainNotarization } from '@iota/notarization/web';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useNotarizationClient } from '~/contexts';

export function useResolveNotarization(objectId: string): UseQueryResult<OnChainNotarization> {
    const { client } = useNotarizationClient();
    return useQuery({
        queryKey: ['resolve-notarization', objectId],
        queryFn: async () => client.getNotarizationById(objectId),
        enabled: !!client,
    });
}
