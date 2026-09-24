// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaDID } from '@iota/identity-wasm/web';
import { useQuery } from '@tanstack/react-query';
import { tryDecodeDidFromUrl } from '~/lib/utils/trust-framework/client';

export function useDecodeDidFromUrl(encodedDid?: string) {
    return useQuery<IotaDID | null>({
        queryKey: ['decoded-did', encodedDid],
        queryFn: () => tryDecodeDidFromUrl(encodedDid!),
        enabled: !!encodedDid,
    });
}
