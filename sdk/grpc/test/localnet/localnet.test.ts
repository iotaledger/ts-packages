// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { fromHex, toBase58 } from '@iota/bcs';
import { beforeAll, describe, expect, it } from 'vitest';

import {
    CheckpointResponseField,
    decodeTransactionEffects,
    TransactionField,
} from '../../src/index.js';
import type { Account } from './setup.js';
import { client, fundedAccount, gasCoins, signedTransfer } from './setup.js';

/**
 * What only a local network can test: a funded key, so transactions really execute. Run against
 * `iota-localnet start --with-faucet` with the gRPC API on (see `prepare:e2e:localnet`).
 */

const IOTA = '0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA';

let account: Account;

beforeAll(async () => {
    account = await fundedAccount();
});

describe('listCoins', () => {
    it("returns the faucet's coins with their exact balances", async () => {
        // The faucet's defaults: five coins of 200 IOTA.
        const { body } = await client.listCoins(account.address);

        expect(body.items.map(({ balance }) => balance)).toEqual(Array(5).fill(200_000_000_000n));
        expect(body.items.every(({ coinType }) => coinType === IOTA)).toBe(true);
    });
});

describe('executeTransaction', () => {
    it('executes a transfer and waits for the checkpoint that includes it', async () => {
        const [gas] = await gasCoins(account.address);

        const { body } = await client.executeTransaction(await signedTransfer(account, gas), {
            readMask: [TransactionField.EFFECTS, TransactionField.CHECKPOINT],
            checkpointInclusionTimeoutMs: 30_000n,
        });

        expect(decodeTransactionEffects(body.effects!).V1.status.$kind).toBe('Success');
        expect(body.checkpoint).toBeDefined();
    });
});

describe('executeTransactions', () => {
    it('executes each transaction in its own slot', async () => {
        const [first, second] = await gasCoins(account.address);

        const { body } = await client.executeTransactions(
            [await signedTransfer(account, first), await signedTransfer(account, second)],
            { readMask: TransactionField.EFFECTS },
        );

        expect(
            body.map(
                (result) =>
                    result.ok && decodeTransactionEffects(result.value.effects!).V1.status.$kind,
            ),
        ).toEqual(['Success', 'Success']);
    });
});

describe('streamCheckpoints', () => {
    it('finds the checkpoint of a transaction by filtering on its sender', async () => {
        // A new account, so this transfer is the only transaction it has sent.
        const sender = await fundedAccount();
        const [gas] = await gasCoins(sender.address);
        const { body: executed } = await client.executeTransaction(
            await signedTransfer(sender, gas),
            {
                readMask: [TransactionField.TRANSACTION_DIGEST, TransactionField.CHECKPOINT],
                checkpointInclusionTimeoutMs: 30_000n,
            },
        );
        const checkpoint = executed.checkpoint!;

        const stream = client.streamCheckpoints({
            startSequenceNumber: checkpoint > 20n ? checkpoint - 20n : 0n,
            endSequenceNumber: checkpoint,
            readMask: [
                CheckpointResponseField.CHECKPOINT_SUMMARY,
                CheckpointResponseField.TRANSACTIONS_TRANSACTION_DIGEST,
            ],
            transactionsFilter: {
                filter: {
                    case: 'sender',
                    value: { address: { address: fromHex(sender.address) } },
                },
            },
            filterCheckpoints: true,
        });

        const checkpoints: bigint[] = [];
        const digests: string[] = [];
        for await (const item of stream.items) {
            if (item.kind === 'checkpoint') {
                checkpoints.push(item.sequenceNumber);
                digests.push(
                    ...item.transactions.map(({ transaction }) =>
                        toBase58(transaction!.digest!.digest),
                    ),
                );
            }
        }

        expect(checkpoints).toEqual([checkpoint]);
        expect(digests).toContain(toBase58(executed.transaction!.digest!.digest));
    });
});
