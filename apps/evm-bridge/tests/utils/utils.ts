// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ethers, HDNodeWallet, Wallet } from 'ethers';
import type { IotaClient } from '@iota/iota-sdk/client';
import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { retryUntil } from './retry';

export type TestWalletData = {
    addressL1: string;
    addressL2: string;
    mnemonicL1: string;
    mnemonicL2: string;
};

export function generate24WordMnemonic() {
    const entropy = ethers.randomBytes(32);
    return ethers.Mnemonic.fromEntropy(entropy).phrase;
}

export function deriveAddressFromMnemonic(mnemonic: string) {
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    const address = keypair.getPublicKey().toIotaAddress();
    return { address, keypair };
}

export async function checkBalanceWithRetries(
    fetchBalance: () => Promise<string | null>,
    layer: 'L1' | 'L2',
    timeout = 60_000,
    delay = 2500,
): Promise<string | null> {
    try {
        return await retryUntil(fetchBalance, {
            until: (result) => !!result && !result.startsWith('0'),
            timeoutMs: timeout,
            delayMs: delay,
            maxDelayMs: 10_000,
            onRetry: (msg) => console.log(`Retrying fetching ${layer} balance: ${msg}`),
        });
    } catch (error) {
        throw new Error(`${layer} balance did not become available within ${timeout} ms.`, {
            cause: error,
        });
    }
}

export async function waitForL1Coins(client: IotaClient, address: string, timeout = 60_000) {
    try {
        await retryUntil(() => client.getCoins({ owner: address }), {
            until: ({ data }) => data.length > 0,
            timeoutMs: timeout,
            delayMs: 500,
            maxDelayMs: 8_000,
            onRetry: (msg) => console.warn(`Retrying getting L1 coins for ${address}: ${msg}`),
        });
    } catch (error) {
        throw new Error(
            `No coins visible for ${address} within ${timeout} ms of a successful faucet request.`,
            { cause: error },
        );
    }
}

export function getRandomL2MnemonicAndAddress(): { mnemonic: string; address: string } {
    const mnemonic = Wallet.createRandom().mnemonic;

    if (!mnemonic) {
        throw new Error('Failed to generate mnemonic');
    }

    return {
        mnemonic: mnemonic.phrase,
        address: HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/0`).address,
    };
}

export function generateTestWallets(): TestWalletData {
    const mnemonicL1 = generate24WordMnemonic();
    const { address: addressL1 } = deriveAddressFromMnemonic(mnemonicL1);

    const { mnemonic: mnemonicL2, address: addressL2 } = getRandomL2MnemonicAndAddress();

    return {
        mnemonicL1,
        addressL1,
        mnemonicL2,
        addressL2,
    };
}
