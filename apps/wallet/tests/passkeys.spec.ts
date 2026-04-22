// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { LONG_TIMEOUT, SHORT_TIMEOUT } from './constants/timeout.constants';
import { expect, test } from './utils/fixtures';
import { receiverAddressMnemonic } from './mocks';
import { generateKeypairFromMnemonic } from './utils/utils';
import { setPresence, setVerified } from './utils/passkeySigner';
import {
    addVirtualAuthenticator,
    createPasskeyWallet,
    restorePasskeyAccount,
    TESTS_PASSWORD,
} from './utils/wallet';

const username = 'IOTAPasskey';

test('Should register a passkey account type with platform authenticator', async ({
    page,
    extensionUrl,
}) => {
    const { client, authenticatorId } = await createPasskeyWallet(page, extensionUrl, {
        username,
    });

    await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
    await client.send('WebAuthn.disable');
    await page.close();
});

test('Should register a passkey account type with cross-platform authenticator', async ({
    page,
    extensionUrl,
}) => {
    const { client, authenticatorId } = await createPasskeyWallet(page, extensionUrl, {
        username,
        isCrossPlatform: true,
    });

    await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
    await client.send('WebAuthn.disable');
    await page.close();
});

test('Sends funds to another account', async ({ page, extensionUrl }) => {
    const { client, authenticatorId } = await createPasskeyWallet(page, extensionUrl, {
        username,
    });

    const receivingKeypair = await generateKeypairFromMnemonic(receiverAddressMnemonic.join(' '));
    const receivingAddress = receivingKeypair.getPublicKey().toIotaAddress();

    await expect(page.getByTestId('coin-balance')).toHaveText('0');

    await page.getByTestId('faucet-button').click();

    const balanceLocator = page.getByTestId('coin-balance');
    await expect(balanceLocator).not.toHaveText('0', { timeout: LONG_TIMEOUT });

    await page.getByTestId('send-coin-button').click();
    const overlay = page.locator('#overlay-portal-container');
    await expect(page.getByTestId('overlay-title')).toHaveText('Send', { timeout: LONG_TIMEOUT });

    await overlay.getByRole('button', { name: 'Max' }).click();
    await overlay.getByPlaceholder('Enter Address').fill(receivingAddress);

    const reviewButton = overlay.getByRole('button', { name: 'Review' });
    await expect(reviewButton).toBeEnabled({ timeout: LONG_TIMEOUT });
    await reviewButton.click();

    await expect(page.getByTestId('overlay-title')).toHaveText('Review & Send', {
        timeout: LONG_TIMEOUT,
    });

    const sendNowButton = overlay.getByRole('button', { name: /Send Now/ });
    await expect(sendNowButton).toBeEnabled({ timeout: LONG_TIMEOUT });
    await sendNowButton.click();

    await expect(page.getByText('Successfully sent')).toBeVisible({ timeout: SHORT_TIMEOUT });

    await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
    await client.send('WebAuthn.disable');
    await page.close();
});

test('Creates a passkey account, resets the wallet and logs back in', async ({
    page,
    extensionUrl,
}) => {
    const { client, authenticatorId } = await createPasskeyWallet(page, extensionUrl, {
        username,
    });

    await page.getByTestId('receive-coin-button').click();

    const addressLocator = page.locator("div[data-testid='receive-address']");
    await expect(addressLocator).toBeVisible({ timeout: 10_000 });
    const address = (await addressLocator.textContent()) || '';
    expect(address.length).toBeGreaterThan(0);

    await page.getByTestId('close-icon').click();
    await page.getByTestId('wallet-settings-button').click();

    await page.getByText('Reset').click();
    await page.getByPlaceholder('Password').fill(TESTS_PASSWORD);
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.getByRole('button', { name: 'Reset' }).click();

    await expect(page.getByText('IOTA Wallet')).toBeVisible();

    await restorePasskeyAccount(page);

    await page.getByTestId('username-input').fill(username);
    await page.getByRole('button', { name: /Continue/ }).click();

    await expect(page.getByText(username)).toBeVisible();
    await page.getByTestId('receive-coin-button').click();

    const newAddressLocator = page.locator("div[data-testid='receive-address']");
    await expect(newAddressLocator).toBeVisible({ timeout: 10_000 });
    const newAddress = (await newAddressLocator.textContent()) || '';
    expect(newAddress.length).toBeGreaterThan(0);
    expect(newAddress).toBe(address);

    await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
    await client.send('WebAuthn.disable');
    await page.close();
});

test('Fails when a different authenticator tries to log in', async ({ page, extensionUrl }) => {
    const { client, authenticatorId } = await createPasskeyWallet(page, extensionUrl, {
        username,
    });

    await page.getByTestId('receive-coin-button').click();

    const addressLocator = page.locator("div[data-testid='receive-address']");
    await expect(addressLocator).toBeVisible({ timeout: 10_000 });
    const address = (await addressLocator.textContent()) || '';
    expect(address.length).toBeGreaterThan(0);

    await page.getByTestId('close-icon').click();
    await page.getByTestId('wallet-settings-button').click();

    await page.getByText('Reset').click();
    await page.getByPlaceholder('Password').fill(TESTS_PASSWORD);
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.getByRole('button', { name: 'Reset' }).click(); // Dialog confirmation

    await expect(page.getByText('IOTA Wallet')).toBeVisible();

    await setPresence(client, authenticatorId, false);
    await setVerified(client, authenticatorId, false);

    // Remove the authenticator before creating a new one (Chrome only supports one virtual authenticator simultaneously)
    await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });

    // Create a new authenticator
    const { authenticatorId: secondAuthenticatorId } = await addVirtualAuthenticator(client, {
        automaticPresenceSimulation: true,
    });

    await restorePasskeyAccount(page);

    const errorLocator = page.getByText(
        'Passkey operation failed: The operation either timed out or was not allowed.',
    );
    await expect(errorLocator).toBeVisible();

    await client.send('WebAuthn.removeVirtualAuthenticator', {
        authenticatorId: secondAuthenticatorId,
    });
    await client.send('WebAuthn.disable');
    await page.close();
});
