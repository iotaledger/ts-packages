// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import { type ProgrammableTransaction } from '@iota/iota-sdk/client';
import { type Page, expect, test } from '@playwright/test';

import { faucet, split_coin } from './utils/localnet';

async function waitForTransactionPage(page: Page): Promise<void> {
    await page.getByTestId('heading-object-id').waitFor({ state: 'visible' });
    await page.getByTestId('transaction-data').waitFor({ state: 'visible' });
}

test('displays gas breakdown', async ({ page }) => {
    const address = await faucet();
    const tx = await split_coin(address);
    const txid = tx.digest;
    await page.goto(`/txblock/${txid}`);
    await waitForTransactionPage(page);
    await expect(page.getByTestId('gas-breakdown')).toBeVisible();
});

test('displays inputs', async ({ page }) => {
    const address = await faucet();
    const tx = await split_coin(address);
    const txid = tx.digest;
    await page.goto(`/txblock/${txid}`);
    await waitForTransactionPage(page);
    await page.getByRole('button', { name: 'Inputs + Transactions' }).click();

    const programmableTxn = tx.transaction!.data.transaction as ProgrammableTransaction;
    const actualInputsCount = programmableTxn.inputs.length;

    await expect(page.getByRole('heading', { name: 'Inputs' })).toBeVisible();
    const inputsContent = page.getByTestId('inputs-card-content');
    await expect(inputsContent).toBeVisible();
    await expect(inputsContent.locator('tbody tr')).toHaveCount(actualInputsCount);
});

test('displays transactions card', async ({ page }) => {
    const address = await faucet();
    const tx = await split_coin(address);
    const txid = tx.digest;
    await page.goto(`/txblock/${txid}`);
    await waitForTransactionPage(page);
    await page.getByRole('button', { name: 'Inputs + Transactions' }).click();

    const programmableTxn = tx.transaction!.data.transaction as ProgrammableTransaction;
    const actualTransactionsCount = programmableTxn.transactions.length;

    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
    const transactionsContent = page.getByTestId('transactions-card-content');
    await expect(transactionsContent).toBeVisible();
    await expect(transactionsContent.locator('tbody tr')).toHaveCount(actualTransactionsCount);
});
