// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Code } from '@connectrpc/connect';
import { toBase64 } from '@iota/bcs';
import { Transaction } from '@iota/iota-sdk/transactions';
import { beforeAll, describe, expect, it } from 'vitest';

import type { GrpcNetwork } from '../../src/index.js';
import {
    decodeTransactionEffects,
    IotaGrpcClient,
    ServerError,
    SimulateField,
} from '../../src/index.js';

/** They run different node versions, so every method has to work on each of them. */
const NETWORKS: GrpcNetwork[] = ['mainnet', 'testnet', 'devnet'];

/** Owns nothing: the node pays the simulation with a mock gas coin. */
const SENDER = `0x${'ab'.repeat(32)}`;

/** An Ed25519 flag followed by an all-zero signature and key, which no node accepts. */
const INVALID_SIGNATURE = toBase64(new Uint8Array(97));

/** Splits one NANO off the gas coin and sends it back, with the gas payment left empty. */
function transferToSelf(referenceGasPrice: bigint): Promise<Uint8Array> {
    const tx = new Transaction();
    tx.setSender(SENDER);
    tx.setGasPrice(referenceGasPrice);
    tx.setGasBudget(50_000_000n);
    tx.setGasPayment([]);
    const [coin] = tx.splitCoins(tx.gas, [1]);
    tx.transferObjects([coin], SENDER);
    return tx.build();
}

describe.each(NETWORKS)('%s', (network) => {
    const client = new IotaGrpcClient({ network });
    let transaction: Uint8Array;

    beforeAll(async () => {
        const { body: referenceGasPrice } = await client.getReferenceGasPrice();
        transaction = await transferToSelf(referenceGasPrice);
    });

    describe('simulateTransaction', () => {
        it('runs a transfer paid with a mock gas coin', async () => {
            const { body } = await client.simulateTransaction({ transaction });

            expect(body.executionResult.case).toBe('commandResults');
            expect(body.suggestedGasPrice).toBeGreaterThan(0n);
            const effects = decodeTransactionEffects(body.executedTransaction!.effects!);
            expect(effects.V1.status.$kind).toBe('Success');
        });
    });

    describe('simulateTransactions', () => {
        it('runs each transaction, with and without the VM checks', async () => {
            const { body } = await client.simulateTransactions(
                [{ transaction }, { transaction: toBase64(transaction), skipChecks: true }],
                { readMask: SimulateField.SUGGESTED_GAS_PRICE },
            );

            expect(body.map((result) => result.ok)).toEqual([true, true]);
            for (const result of body) {
                expect(result.ok && result.value.suggestedGasPrice).toBeGreaterThan(0n);
            }
        });
    });

    describe('executeTransaction', () => {
        it("throws the node's error for a signature that is not valid", async () => {
            const error = await client
                .executeTransaction({ transaction, signatures: [INVALID_SIGNATURE] })
                .catch((error: unknown) => error);

            expect(error).toBeInstanceOf(ServerError);
            expect(error).toMatchObject({ code: Code.InvalidArgument });
        });
    });

    describe('executeTransactions', () => {
        it("returns the node's error in the slot of each signature that is not valid", async () => {
            const { body } = await client.executeTransactions([
                { transaction, signatures: [INVALID_SIGNATURE] },
                { transaction, signatures: [INVALID_SIGNATURE] },
            ]);

            expect(body).toHaveLength(2);
            for (const result of body) {
                expect(result.ok).toBe(false);
                if (result.ok) continue;
                expect(result.error).toBeInstanceOf(ServerError);
                expect(result.error).toMatchObject({ code: Code.InvalidArgument });
            }
        });
    });

    describe('viewFunctionCall', () => {
        it("throws the node's error for a function not declared #[view]", async () => {
            const error = await client
                .viewFunctionCall({
                    fqFunctionName: '0x2::coin::value',
                    typeArgs: ['0x2::iota::IOTA'],
                })
                .catch((error: unknown) => error);

            expect(error).toBeInstanceOf(ServerError);
            expect(error).toMatchObject({ code: Code.InvalidArgument });
        });
    });

    describe('viewFunctionCalls', () => {
        it("returns the node's error in the slot of each call it refuses", async () => {
            const { body } = await client.viewFunctionCalls([
                { fqFunctionName: '0x2::coin::value', typeArgs: ['0x2::iota::IOTA'] },
                { fqFunctionName: '0x2::coin::no_such_function' },
            ]);

            expect(body).toHaveLength(2);
            for (const result of body) {
                expect(result.ok).toBe(false);
                if (result.ok) continue;
                expect(result.error).toBeInstanceOf(ServerError);
                expect(result.error).toMatchObject({ code: Code.InvalidArgument });
            }
        });
    });
});
