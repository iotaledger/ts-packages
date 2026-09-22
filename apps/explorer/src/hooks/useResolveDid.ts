// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaDID } from '@iota/identity-wasm/web';
import { useQuery } from '@tanstack/react-query';
import { useIdentityClient } from '~/contexts';

export function useResolveDid(did: IotaDID | null) {
    const identityClient = useIdentityClient();
    return useQuery({
        queryKey: ['did-document', did],
        queryFn: async () => identityClient?.resolveDid(did!),
        enabled: !!(did && identityClient),
    });
}
