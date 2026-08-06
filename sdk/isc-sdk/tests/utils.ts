// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaClient } from '@iota/iota-sdk/client';
import { requestIotaFromFaucet } from '@iota/iota-sdk/faucet';
import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { Transaction } from '@iota/iota-sdk/transactions';
import type { AssetsResponse } from '../src/index.js';
import { EvmRpcClient } from '../src/index.js';
import { CONFIG } from './config.js';
import { NANOS_PER_IOTA } from '@iota/iota-sdk/utils';
import { retry } from 'ts-retry-promise';

const { L2 } = CONFIG;

const COIN_VISIBILITY_TIMEOUT_MS = 60_000;

/**
 * Wait in case indexer lags but faucet request returns successful.
 */
export async function waitForCoins(client: IotaClient, address: string) {
    try {
        await retry(() => client.getCoins({ owner: address }), {
            until: ({ data }) => data.length > 0,
            retries: 'INFINITELY',
            timeout: COIN_VISIBILITY_TIMEOUT_MS,
            delay: 500,
            backoff: 'EXPONENTIAL',
            maxBackOff: 8_000,
            logger: (msg) => console.warn(`Retrying getting coins for ${address}: ${msg}`),
        });
    } catch {
        throw new Error(
            `No coins visible for ${address} within ${COIN_VISIBILITY_TIMEOUT_MS} ms of a successful faucet request.`,
        );
    }
}

export async function requestFunds(
    client: IotaClient,
    faucetUrl: string,
    recipientAddress: string,
) {
    const keypair = new Ed25519Keypair();
    const address = keypair.toIotaAddress();

    await requestIotaFromFaucet({
        host: faucetUrl,
        recipient: address,
    });

    await waitForCoins(client, address);

    const transaction = new Transaction();
    const [coin] = transaction.splitCoins(transaction.gas, [1n * NANOS_PER_IOTA]);
    transaction.transferObjects([coin], recipientAddress);
    transaction.setSender(address);

    await transaction.build({ client });

    await client.signAndExecuteTransaction({
        signer: keypair,
        transaction,
    });
}

export async function checkL2BalanceWithRetries(
    address: string,
    coinType?: string,
    timeout = 60_000,
    delay = 2500,
): Promise<AssetsResponse | null> {
    const evmClient = new EvmRpcClient(L2.evmRpcUrl);
    let evmBalance: AssetsResponse | null = null;

    function hasExpectedBalances(balance: AssetsResponse) {
        const nativeToken = balance.nativeTokens?.find((t) => t.coinType === coinType);
        const nativeTokenBalance = nativeToken ? nativeToken.balance : '0';
        return (
            !balance.baseTokens.startsWith('0') &&
            (!coinType || !nativeTokenBalance.startsWith('0'))
        );
    }

    try {
        await retry(
            async () => {
                evmBalance = await evmClient.getBalanceBaseToken(address);
                return evmBalance;
            },
            {
                until: hasExpectedBalances,
                retries: 'INFINITELY',
                timeout,
                delay,
                backoff: 'EXPONENTIAL',
                maxBackOff: 10_000,
                logger: (msg) => console.log(`Retrying fetching EVM balance: ${msg}`),
            },
        );
    } catch (error) {
        console.error('EVM balance did not reach the expected amounts:', error);
    }

    return evmBalance;
}
