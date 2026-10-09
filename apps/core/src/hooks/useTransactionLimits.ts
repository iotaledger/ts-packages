// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import { useQuery } from '@tanstack/react-query';

export interface TransactionLimits {
    maxTxSizeBytes: number;
    maxArguments: number;
}

type ProtocolConfigValue = Record<string, string> | null | undefined;

function readLimit(value: ProtocolConfigValue, type: 'u64' | 'u32'): number {
    return value && type in value ? Number(value[type]) : Infinity;
}

export function useTransactionLimits<TData = TransactionLimits>(
    select?: (limits: TransactionLimits) => TData,
) {
    const client = useIotaClient();

    return useQuery({
        queryKey: ['protocol-config-transaction-limits'],
        queryFn: async (): Promise<TransactionLimits> => {
            const { attributes } = await client.getProtocolConfig();
            return {
                maxTxSizeBytes: readLimit(attributes['max_tx_size_bytes'], 'u64'),
                maxArguments: readLimit(attributes['max_arguments'], 'u32'),
            };
        },
        select,
        enabled: !!client,
    });
}
