// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { setTimeout as sleep } from 'node:timers/promises';
import { toBase58, toHex } from '@iota/bcs';
import { getFaucetHost, requestIotaFromFaucet } from '@iota/iota-sdk/faucet';
import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { Transaction } from '@iota/iota-sdk/transactions';

import type { SignedTransaction } from '../../src/index.js';
import { IotaGrpcClient } from '../../src/index.js';

export const client = new IotaGrpcClient({ network: 'localnet' });

export type Account = { keypair: Ed25519Keypair; address: string };

type GasCoin = { objectId: string; version: string; digest: string };

/** A new key, funded by the faucet. Returns once its coins can be listed. */
export async function fundedAccount(): Promise<Account> {
    const keypair = Ed25519Keypair.generate();
    const address = keypair.toIotaAddress();
    await requestIotaFromFaucet({ host: getFaucetHost('localnet'), recipient: address });

    for (let attempt = 0; attempt < 50; attempt++) {
        const { body } = await client.listCoins(address);
        if (body.items.length > 0) {
            return { keypair, address };
        }
        await sleep(200);
    }
    throw new Error(`the faucet's coins never reached ${address}`);
}

/** The account's IOTA coins, in the form a gas payment takes. */
export async function gasCoins(address: string): Promise<GasCoin[]> {
    const { body } = await client.listOwnedObjects(address, {
        objectType: '0x2::coin::Coin<0x2::iota::IOTA>',
    });
    return body.items.map(({ reference }) => ({
        objectId: `0x${toHex(reference!.objectId!.objectId)}`,
        version: String(reference!.version),
        digest: toBase58(reference!.digest!.digest),
    }));
}

/** A transfer of one NANO from `account` to itself, paid with `gas` and signed. */
export async function signedTransfer(account: Account, gas: GasCoin): Promise<SignedTransaction> {
    const { body: referenceGasPrice } = await client.getReferenceGasPrice();

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [1]);
    tx.transferObjects([coin], account.address);
    tx.setSender(account.address);
    tx.setGasPrice(referenceGasPrice);
    tx.setGasBudget(100_000_000n);
    tx.setGasPayment([gas]);

    const bytes = await tx.build();
    const { signature } = await account.keypair.signTransaction(bytes);
    return { transaction: bytes, signatures: [signature] };
}
