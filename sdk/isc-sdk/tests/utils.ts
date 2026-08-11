// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaClient } from "@iota/iota-sdk/client";
import { requestIotaFromFaucet } from "@iota/iota-sdk/faucet";
import { Ed25519Keypair } from "@iota/iota-sdk/keypairs/ed25519";
import { Transaction } from "@iota/iota-sdk/transactions";
import type { AssetsResponse } from "../src/index.js";
import { EvmRpcClient } from "../src/index.js";
import { CONFIG } from "./config.js";
import { NANOS_PER_IOTA } from "@iota/iota-sdk/utils";
import { retry } from "ts-retry-promise";

const { L2 } = CONFIG;

const BALANCE_VISIBILITY_TIMEOUT_MS = 60_000;
const AMOUNT_TO_TRANSFER = 1n * NANOS_PER_IOTA;

async function waitForBalance(client: IotaClient, address: string, minimumBalance: bigint) {
  try {
    await retry(() => client.getBalance({ owner: address }), {
      until: ({ totalBalance }) => BigInt(totalBalance) >= minimumBalance,
      retries: "INFINITELY",
      timeout: BALANCE_VISIBILITY_TIMEOUT_MS,
      delay: 500,
      backoff: "LINEAR",
      maxBackOff: 8_000,
      logger: (msg) => console.warn(`Retrying getting balance for ${address}: ${msg}`),
    });
  } catch (error) {
    throw new Error(`${address} balance didn't reach ${minimumBalance}.`, { cause: error });
  }
}

export async function fundFromFaucet(
  client: IotaClient,
  faucetUrl: string,
  address: string,
  minimumBalance: bigint,
) {
  await requestIotaFromFaucet({
    host: faucetUrl,
    recipient: address,
  });

  await waitForBalance(client, address, minimumBalance);
}

export async function requestFunds(
  client: IotaClient,
  faucetUrl: string,
  recipientAddress: string,
) {
  const keypair = new Ed25519Keypair();
  const address = keypair.toIotaAddress();

  await fundFromFaucet(client, faucetUrl, address, AMOUNT_TO_TRANSFER);

  const transaction = new Transaction();
  const [coin] = transaction.splitCoins(transaction.gas, [AMOUNT_TO_TRANSFER]);
  transaction.transferObjects([coin], recipientAddress);
  transaction.setSender(address);

  await transaction.build({ client });

  const { digest } = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction,
  });

  await client.waitForTransaction({ digest, waitMode: "indexed-on-node" });
}

export async function checkL2BalanceWithRetries(
  address: string,
  coinType?: string,
  timeout = 60_000,
  delay = 2500,
): Promise<AssetsResponse> {
  const evmClient = new EvmRpcClient(L2.evmRpcUrl);

  function hasExpectedBalances(balance: AssetsResponse) {
    const nativeToken = balance.nativeTokens?.find((t) => t.coinType === coinType);
    const nativeTokenBalance = nativeToken ? nativeToken.balance : "0";
    return balance.baseTokens !== "0" && (!coinType || nativeTokenBalance !== "0");
  }

  try {
    return await retry(() => evmClient.getBalanceBaseToken(address), {
      until: hasExpectedBalances,
      retries: "INFINITELY",
      timeout,
      delay,
      backoff: "LINEAR",
      maxBackOff: 10_000,
      logger: (msg) => console.log(`Retrying fetching EVM balance: ${msg}`),
    });
  } catch (error) {
    throw new Error(
      `EVM balance of ${address} did not reach the expected amounts within ${timeout} ms.`,
      { cause: error },
    );
  }
}
