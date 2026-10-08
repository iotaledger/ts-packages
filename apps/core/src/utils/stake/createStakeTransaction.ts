// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { CoinStruct } from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { IOTA_SYSTEM_STATE_OBJECT_ID } from '@iota/iota-sdk/utils';

export interface StakeCoinOptions {
    coins: CoinStruct[];
    maxArguments: number;
}

export function createStakeTransaction(
    amount: bigint,
    validator: string,
    options?: StakeCoinOptions,
) {
    const tx = new Transaction();

    if (options?.coins.length) {
        const { coins, maxArguments } = options;
        const mergeBatchSize = Math.max(1, maxArguments - 1);
        const [gasCoin, ...coinsToMerge] = coins;

        tx.setGasPayment([
            { objectId: gasCoin.coinObjectId, version: gasCoin.version, digest: gasCoin.digest },
        ]);

        for (let i = 0; i < coinsToMerge.length; i += mergeBatchSize) {
            const batch = coinsToMerge.slice(i, i + mergeBatchSize);
            tx.mergeCoins(
                tx.gas,
                batch.map((coin) => tx.object(coin.coinObjectId)),
            );
        }
    }

    const stakeCoin = tx.splitCoins(tx.gas, [amount]);
    tx.moveCall({
        target: '0x3::iota_system::request_add_stake',
        arguments: [
            tx.sharedObjectRef({
                objectId: IOTA_SYSTEM_STATE_OBJECT_ID,
                initialSharedVersion: 1,
                mutable: true,
            }),
            stakeCoin,
            tx.pure.address(validator),
        ],
    });
    return tx;
}
