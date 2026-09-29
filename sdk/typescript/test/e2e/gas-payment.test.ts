// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import { Transaction } from '../../src/transactions';
import { DEFAULT_RECIPIENT, setup, TestToolbox } from './utils/setup';

const COIN_COUNT = 60;

describe('Gas payment resolution', () => {
    let toolbox: TestToolbox;
    let coinBalance: bigint;

    beforeAll(async () => {
        toolbox = await setup();

        const { totalBalance } = await toolbox.client.getBalance({ owner: toolbox.address() });
        coinBalance = BigInt(totalBalance) / BigInt(COIN_COUNT);

        const tx = new Transaction();
        const coins = tx.splitCoins(
            tx.gas,
            Array.from({ length: COIN_COUNT - 1 }, () => coinBalance),
        );
        tx.transferObjects(
            Array.from({ length: COIN_COUNT - 1 }, (_, i) => coins[i]),
            toolbox.address(),
        );

        const { digest } = await toolbox.client.signAndExecuteTransaction({
            transaction: tx,
            signer: toolbox.keypair,
        });
        await toolbox.client.waitForTransaction({ digest });
    });

    it('uses coins beyond the first page to pay for gas', async () => {
        const firstPage = await toolbox.getGasObjectsOwnedByAddress();
        expect(firstPage.hasNextPage).toBe(true);

        const firstPageBalance = firstPage.data.reduce(
            (total, coin) => total + BigInt(coin.balance),
            0n,
        );
        const amount = firstPageBalance + coinBalance;

        const tx = new Transaction();
        const [coin] = tx.splitCoins(tx.gas, [amount]);
        tx.transferObjects([coin], DEFAULT_RECIPIENT);

        const result = await toolbox.client.signAndExecuteTransaction({
            transaction: tx,
            signer: toolbox.keypair,
            options: { showEffects: true, showInput: true },
        });

        expect(result.effects?.status.status).toEqual('success');
        expect(result.transaction?.data.gasData.payment.length).toBeGreaterThan(
            firstPage.data.length,
        );
    });
});
