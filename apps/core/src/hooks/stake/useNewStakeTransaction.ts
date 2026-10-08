// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useIotaClient } from '@iota/dapp-kit';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { useQuery } from '@tanstack/react-query';
import { buildStakeTransaction, getGasSummary } from '../../utils';
import { getUserFriendlyDryRunExecutionError } from '../../utils/formatUIErrors';
import { Transaction } from '@iota/iota-sdk/transactions';
import { useGetAllCoins } from '../useGetAllCoins';
import { useTransactionLimits } from '../useTransactionLimits';

export function useNewStakeTransaction(validator: string, amount: bigint, senderAddress: string) {
    const client = useIotaClient();
    const { data: limits } = useTransactionLimits();
    const { data: coins, dataUpdatedAt: coinsUpdatedAt } = useGetAllCoins(
        IOTA_TYPE_ARG,
        senderAddress,
    );
    return useQuery({
        // oxlint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: [
            'stake-transaction',
            validator,
            amount.toString(),
            senderAddress,
            coins?.length,
            coinsUpdatedAt,
            limits,
        ],
        queryFn: async () => {
            if (!coins || !limits) throw new Error('Missing coins or transaction limits');
            const { maxTxSizeBytes, maxArguments } = limits;

            const txBytes = await buildStakeTransaction({
                client,
                amount,
                validator,
                senderAddress,
                coins,
                maxArguments,
                maxTxSizeBytes,
            });
            const txDryRun = await client.dryRunTransactionBlock({
                transactionBlock: txBytes,
            });
            if (txDryRun.effects.status.status !== 'success') {
                const errorText = txDryRun.effects.status.error || 'Transaction dry run failed';
                throw new Error(getUserFriendlyDryRunExecutionError(errorText));
            }
            return {
                txBytes,
                txDryRun,
            };
        },
        enabled: !!amount && !!validator && !!senderAddress && !!coins && !!limits,
        gcTime: 0,
        select: ({ txBytes, txDryRun }) => {
            return {
                transaction: Transaction.from(txBytes),
                gasSummary: getGasSummary(txDryRun),
            };
        },
    });
}
