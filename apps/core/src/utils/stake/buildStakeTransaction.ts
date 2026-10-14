// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { CoinStruct, IotaClient } from '@iota/iota-sdk/client';
import { createStakeTransaction } from './createStakeTransaction';
import { selectCoinsForAmount } from './selectCoinsForAmount';
import { sumCoinBalances } from '../sumCoinBalances';

interface BuildStakeTransactionParams {
    client: IotaClient;
    amount: bigint;
    validator: string;
    senderAddress: string;
    coins: CoinStruct[];
    maxArguments: number;
    maxTxSizeBytes: number;
}

export async function buildStakeTransaction({
    client,
    amount,
    validator,
    senderAddress,
    coins,
    maxArguments,
    maxTxSizeBytes,
}: BuildStakeTransactionParams): Promise<Uint8Array> {
    const build = async (selectedCoins: CoinStruct[]) => {
        const transaction = createStakeTransaction(amount, validator, {
            coins: selectedCoins,
            maxArguments,
        });
        transaction.setSender(senderAddress);
        const bytes = await transaction.build({ client, maxSizeBytes: maxTxSizeBytes });
        return { bytes, gasBudget: BigInt(transaction.getData().gasData.budget ?? 0) };
    };

    const selected = selectCoinsForAmount(coins, amount);
    const first = await build(selected);
    const target = amount + first.gasBudget;

    if (sumCoinBalances(selected) < target && selected.length < coins.length) {
        return (await build(selectCoinsForAmount(coins, target))).bytes;
    }

    return first.bytes;
}
