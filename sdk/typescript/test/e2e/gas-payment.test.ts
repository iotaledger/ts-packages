// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from 'vitest';

import { Transaction } from '../../src/transactions';
import { DEFAULT_RECIPIENT, setup, TestToolbox } from './utils/setup';

const COIN_COUNT = 300;
const MAX_GAS_OBJECTS = 255;

describe('Gas payment resolution', () => {
    let toolbox: TestToolbox;
    let coinBalance: bigint;

    beforeEach(async () => {
        toolbox = await setup();

        const { totalBalance } = await toolbox.client.getBalance({
            owner: toolbox.address(),
        });
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

    async function transfer(amount: bigint) {
        const tx = new Transaction();
        const [coin] = tx.splitCoins(tx.gas, [amount]);
        tx.transferObjects([coin], DEFAULT_RECIPIENT);

        return toolbox.client.signAndExecuteTransaction({
            transaction: tx,
            signer: toolbox.keypair,
            options: { showEffects: true, showInput: true },
        });
    }

    it('only uses the first page when it can pay for the transaction', async () => {
        const firstPage = await toolbox.getGasObjectsOwnedByAddress();
        expect(firstPage.hasNextPage).toBe(true);

        const result = await transfer(1n);

        expect(result.effects?.status.status).toEqual('success');
        expect(result.transaction?.data.gasData.payment.length).toBe(firstPage.data.length);
    });

    it('only uses the first page when the transaction does not take from the gas coin', async () => {
        const firstPage = await toolbox.getGasObjectsOwnedByAddress();
        expect(firstPage.hasNextPage).toBe(true);

        const tx = new Transaction();
        tx.transferObjects([tx.object(firstPage.data[0].coinObjectId)], DEFAULT_RECIPIENT);

        const result = await toolbox.client.signAndExecuteTransaction({
            transaction: tx,
            signer: toolbox.keypair,
            options: { showEffects: true, showInput: true },
        });

        expect(result.effects?.status.status).toEqual('success');
        expect(result.transaction?.data.gasData.payment.length).toBe(firstPage.data.length - 1);
    });

    it('uses coins beyond the first page to pay for gas', async () => {
        const firstPage = await toolbox.getGasObjectsOwnedByAddress();
        expect(firstPage.hasNextPage).toBe(true);

        const firstPageBalance = firstPage.data.reduce(
            (total, coin) => total + BigInt(coin.balance),
            0n,
        );

        const result = await transfer(firstPageBalance + coinBalance);

        expect(result.effects?.status.status).toEqual('success');
        expect(result.transaction?.data.gasData.payment.length).toBeGreaterThan(
            firstPage.data.length,
        );
    });

    it(`uses at most ${MAX_GAS_OBJECTS} gas coins`, async () => {
        const result = await transfer(coinBalance * BigInt(MAX_GAS_OBJECTS - 2));

        expect(result.effects?.status.status).toEqual('success');
        expect(result.transaction?.data.gasData.payment.length).toBe(MAX_GAS_OBJECTS);
    });
});
