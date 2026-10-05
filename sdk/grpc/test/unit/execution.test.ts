// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { HandlerContext, ServiceImpl } from '@connectrpc/connect';
import { Code, ConnectError, createRouterTransport } from '@connectrpc/connect';
import { fromBase58, fromHex, toBase58, toBase64 } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { UserSignature } from '../../src/bcs/signatures.js';
import {
    DEFAULT_READ_MASKS,
    EmptyRequestError,
    IotaGrpcClient,
    normalizeReadMask,
    ServerError,
    SignatureConversionError,
    SimulateField,
    TransactionField,
    TransportError,
    UnexpectedResultCountError,
    UnexpectedTransactionError,
    ViewFunctionCallField,
} from '../../src/index.js';
import type {
    ExecuteTransactionsRequest,
    SimulateTransactionsRequest,
    ViewFunctionCallsRequest,
} from '../../src/proto/iota/grpc/v1/transaction_execution_service_pb.js';
import {
    SimulateTransactionItem_TransactionCheckModes,
    TransactionExecutionService,
} from '../../src/proto/iota/grpc/v1/transaction_execution_service_pb.js';

const CHAIN_ID = toBase58(new Uint8Array(32).fill(1));

function sendMetadata(context: HandlerContext) {
    context.responseHeader.set('x-iota-chain-id', CHAIN_ID);
    context.responseHeader.set('x-iota-chain', 'testnet');
    context.responseHeader.set('x-iota-epoch', '42');
    context.responseHeader.set('x-iota-checkpoint-height', '1000');
}

const METADATA = {
    chainId: CHAIN_ID,
    chain: 'testnet',
    epoch: 42n,
    checkpointHeight: 1000n,
};

/** A signed transaction from mainnet: its BCS, its base58 digest, and its signatures' BCS. */
const [fixture] = JSON.parse(
    readFileSync(path.resolve(__dirname, '../fixtures/user-signatures.json'), 'utf8'),
).transactions as { transaction: string; transactionBcs: string; signatures: string[] }[];

const TRANSACTION = fromHex(fixture.transactionBcs);
const DIGEST = fromBase58(fixture.transaction);
/** Base64, as `signTransaction` returns them. */
const SIGNATURES = fixture.signatures.map((hex) => UserSignature.parse(fromHex(hex)));
const SIGNED = { transaction: TRANSACTION, signatures: SIGNATURES };

const NOT_A_TRANSACTION = new Uint8Array([1, 2, 3]);
const FRAMEWORK = '0x0000000000000000000000000000000000000000000000000000000000000002';
const PRICE = '0x1234::shop::price';

function clientFor(execution: Partial<ServiceImpl<typeof TransactionExecutionService>>) {
    return new IotaGrpcClient({
        transport: createRouterTransport(({ service }) =>
            service(TransactionExecutionService, execution),
        ),
    });
}

describe('executeTransactions', () => {
    it('sends each BCS and digest, the signatures as the node encodes them, and the default read mask', async () => {
        const requests: ExecuteTransactionsRequest[] = [];
        const client = clientFor({
            executeTransactions(request) {
                requests.push(request);
                return { transactionResults: [executed(DIGEST), executed(DIGEST)] };
            },
        });

        await client.executeTransactions([
            SIGNED,
            { transaction: toBase64(TRANSACTION), signatures: SIGNATURES },
        ]);

        const [request] = requests;
        expect(request.transactions).toHaveLength(2);
        for (const { transaction, signatures } of request.transactions) {
            expect(transaction?.bcs?.data).toEqual(TRANSACTION);
            expect(transaction?.digest?.digest).toEqual(DIGEST);
            expect(signatures?.signatures.map(({ bcs }) => bcs?.data)).toEqual(
                fixture.signatures.map(fromHex),
            );
        }
        expect(request.readMask?.paths).toEqual(
            normalizeReadMask(DEFAULT_READ_MASKS.executeTransactions),
        );
        expect(request.checkpointInclusionTimeoutMs).toBeUndefined();
    });

    it('sends the given read mask and checkpoint inclusion timeout', async () => {
        const requests: ExecuteTransactionsRequest[] = [];
        const client = clientFor({
            executeTransactions(request) {
                requests.push(request);
                return { transactionResults: [executed(DIGEST)] };
            },
        });

        await client.executeTransactions([SIGNED], {
            readMask: [TransactionField.EFFECTS, TransactionField.CHECKPOINT],
            checkpointInclusionTimeoutMs: 5_000n,
        });

        expect(requests[0].readMask?.paths).toEqual(['effects', 'checkpoint']);
        expect(requests[0].checkpointInclusionTimeoutMs).toBe(5_000n);
    });

    it('returns one result per transaction, in order, with the metadata', async () => {
        const client = clientFor({
            executeTransactions(_request, context) {
                sendMetadata(context);
                return {
                    transactionResults: [executed(DIGEST, 10n), executed(DIGEST, 11n)],
                };
            },
        });

        const { body, metadata } = await client.executeTransactions([SIGNED, SIGNED]);

        expect(body.map((result) => result.ok && result.value.checkpoint)).toEqual([10n, 11n]);
        expect(metadata).toMatchObject(METADATA);
    });

    it('keeps a failed transaction to its own slot', async () => {
        const client = clientFor({
            executeTransactions() {
                return {
                    transactionResults: [
                        executed(DIGEST),
                        failed(Code.InvalidArgument, 'invalid signature'),
                    ],
                };
            },
        });

        const { body } = await client.executeTransactions([SIGNED, SIGNED]);

        expect(body.map((result) => result.ok)).toEqual([true, false]);
        const [, rejected] = body;
        if (rejected.ok) return;
        expect(rejected.error).toBeInstanceOf(ServerError);
        expect(rejected.error).toMatchObject({ code: Code.InvalidArgument });
    });

    it('rejects an empty request without calling the node', async () => {
        let called = false;
        const client = clientFor({
            executeTransactions() {
                called = true;
                return {};
            },
        });

        await expect(client.executeTransactions([])).rejects.toThrow(EmptyRequestError);
        expect(called).toBe(false);
    });

    it('rejects bytes that are not a TransactionData without calling the node', async () => {
        let called = false;
        const client = clientFor({
            executeTransactions() {
                called = true;
                return {};
            },
        });

        await expect(
            client.executeTransactions([
                { transaction: NOT_A_TRANSACTION, signatures: SIGNATURES },
            ]),
        ).rejects.toThrow(TypeError);
        expect(called).toBe(false);
    });

    it('rejects a signature that is not base64 without calling the node', async () => {
        let called = false;
        const client = clientFor({
            executeTransactions() {
                called = true;
                return {};
            },
        });

        await expect(
            client.executeTransactions([{ transaction: TRANSACTION, signatures: ['not base64!'] }]),
        ).rejects.toThrow(SignatureConversionError);
        expect(called).toBe(false);
    });

    it('rejects a different number of results than transactions', async () => {
        const client = clientFor({
            executeTransactions() {
                return { transactionResults: [executed(DIGEST)] };
            },
        });

        await expect(client.executeTransactions([SIGNED, SIGNED])).rejects.toThrow(
            new UnexpectedResultCountError(2, 1),
        );
    });

    it('rejects an answer for a different transaction than sent', async () => {
        const client = clientFor({
            executeTransactions() {
                return { transactionResults: [executed(new Uint8Array(32).fill(9))] };
            },
        });

        await expect(client.executeTransactions([SIGNED])).rejects.toThrow(
            UnexpectedTransactionError,
        );
    });

    it('maps a failed call to a TransportError', async () => {
        const client = clientFor({
            executeTransactions() {
                throw new ConnectError('too many transactions', Code.InvalidArgument);
            },
        });

        const error = await client.executeTransactions([SIGNED]).catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({
            code: Code.InvalidArgument,
            detail: 'too many transactions',
        });
    });
});

describe('executeTransaction', () => {
    it('sends the one transaction with the given read mask and timeout', async () => {
        const requests: ExecuteTransactionsRequest[] = [];
        const client = clientFor({
            executeTransactions(request) {
                requests.push(request);
                return { transactionResults: [executed(DIGEST)] };
            },
        });

        await client.executeTransaction(SIGNED, {
            readMask: TransactionField.EFFECTS,
            checkpointInclusionTimeoutMs: 5_000n,
        });

        const [request] = requests;
        expect(request.transactions).toHaveLength(1);
        expect(request.transactions[0].transaction?.digest?.digest).toEqual(DIGEST);
        expect(request.readMask?.paths).toEqual(['effects']);
        expect(request.checkpointInclusionTimeoutMs).toBe(5_000n);
    });

    it('returns the executed transaction with the metadata', async () => {
        const client = clientFor({
            executeTransactions(_request, context) {
                sendMetadata(context);
                return { transactionResults: [executed(DIGEST, 10n)] };
            },
        });

        const { body, metadata } = await client.executeTransaction(SIGNED);

        expect(body.transaction?.digest?.digest).toEqual(DIGEST);
        expect(body.checkpoint).toBe(10n);
        expect(metadata).toMatchObject(METADATA);
    });

    it('throws the error of its slot', async () => {
        const client = clientFor({
            executeTransactions() {
                return { transactionResults: [failed(Code.InvalidArgument, 'invalid signature')] };
            },
        });

        await expect(client.executeTransaction(SIGNED)).rejects.toThrow(
            new ServerError(Code.InvalidArgument, 'invalid signature'),
        );
    });

    it('rejects bytes that are not a TransactionData without calling the node', async () => {
        let called = false;
        const client = clientFor({
            executeTransactions() {
                called = true;
                return {};
            },
        });

        await expect(
            client.executeTransaction({ transaction: NOT_A_TRANSACTION, signatures: SIGNATURES }),
        ).rejects.toThrow(TypeError);
        expect(called).toBe(false);
    });

    it('maps a failed call to a TransportError', async () => {
        const client = clientFor({
            executeTransactions() {
                throw new ConnectError('node is shutting down', Code.Unavailable);
            },
        });

        const error = await client.executeTransaction(SIGNED).catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unavailable });
    });
});

describe('simulateTransactions', () => {
    it('sends each BCS and digest, skipping the VM checks only when asked, and the default read mask', async () => {
        const requests: SimulateTransactionsRequest[] = [];
        const client = clientFor({
            simulateTransactions(request) {
                requests.push(request);
                return { transactionResults: [simulated(1000n), simulated(1000n)] };
            },
        });

        await client.simulateTransactions([
            { transaction: TRANSACTION },
            { transaction: toBase64(TRANSACTION), skipChecks: true },
        ]);

        const [request] = requests;
        for (const { transaction } of request.transactions) {
            expect(transaction?.bcs?.data).toEqual(TRANSACTION);
            expect(transaction?.digest?.digest).toEqual(DIGEST);
        }
        expect(request.transactions.map(({ txChecks }) => txChecks)).toEqual([
            [],
            [SimulateTransactionItem_TransactionCheckModes.DISABLE_VM_CHECKS],
        ]);
        expect(request.readMask?.paths).toEqual(
            normalizeReadMask(DEFAULT_READ_MASKS.simulateTransactions),
        );
    });

    it('sends the given read mask', async () => {
        const requests: SimulateTransactionsRequest[] = [];
        const client = clientFor({
            simulateTransactions(request) {
                requests.push(request);
                return { transactionResults: [simulated(1000n)] };
            },
        });

        await client.simulateTransactions([{ transaction: TRANSACTION }], {
            readMask: SimulateField.SUGGESTED_GAS_PRICE,
        });

        expect(requests[0].readMask?.paths).toEqual(['suggested_gas_price']);
    });

    it('returns one result per transaction, in order, with the metadata', async () => {
        const client = clientFor({
            simulateTransactions(_request, context) {
                sendMetadata(context);
                return { transactionResults: [simulated(1000n), simulated(2000n)] };
            },
        });

        const { body, metadata } = await client.simulateTransactions([
            { transaction: TRANSACTION },
            { transaction: TRANSACTION },
        ]);

        expect(body.map((result) => result.ok && result.value.suggestedGasPrice)).toEqual([
            1000n,
            2000n,
        ]);
        expect(metadata).toMatchObject(METADATA);
    });

    it('keeps a failed simulation to its own slot', async () => {
        const client = clientFor({
            simulateTransactions() {
                return {
                    transactionResults: [
                        failed(Code.InvalidArgument, 'gas budget too low'),
                        simulated(1000n),
                    ],
                };
            },
        });

        const { body } = await client.simulateTransactions([
            { transaction: TRANSACTION },
            { transaction: TRANSACTION },
        ]);

        expect(body.map((result) => result.ok)).toEqual([false, true]);
        const [rejected] = body;
        if (rejected.ok) return;
        expect(rejected.error).toBeInstanceOf(ServerError);
        expect(rejected.error).toMatchObject({ code: Code.InvalidArgument });
    });

    it('rejects an empty request without calling the node', async () => {
        let called = false;
        const client = clientFor({
            simulateTransactions() {
                called = true;
                return {};
            },
        });

        await expect(client.simulateTransactions([])).rejects.toThrow(EmptyRequestError);
        expect(called).toBe(false);
    });

    it('rejects bytes that are not a TransactionData without calling the node', async () => {
        let called = false;
        const client = clientFor({
            simulateTransactions() {
                called = true;
                return {};
            },
        });

        await expect(
            client.simulateTransactions([{ transaction: NOT_A_TRANSACTION }]),
        ).rejects.toThrow(TypeError);
        expect(called).toBe(false);
    });

    it('rejects a different number of results than transactions', async () => {
        const client = clientFor({
            simulateTransactions() {
                return { transactionResults: [] };
            },
        });

        await expect(client.simulateTransactions([{ transaction: TRANSACTION }])).rejects.toThrow(
            new UnexpectedResultCountError(1, 0),
        );
    });

    it('maps a failed call to a TransportError', async () => {
        const client = clientFor({
            simulateTransactions() {
                throw new ConnectError('too many transactions', Code.InvalidArgument);
            },
        });

        const error = await client
            .simulateTransactions([{ transaction: TRANSACTION }])
            .catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({
            code: Code.InvalidArgument,
            detail: 'too many transactions',
        });
    });
});

describe('simulateTransaction', () => {
    it('sends the one transaction, skipping the VM checks when asked, with the given read mask', async () => {
        const requests: SimulateTransactionsRequest[] = [];
        const client = clientFor({
            simulateTransactions(request) {
                requests.push(request);
                return { transactionResults: [simulated(1000n)] };
            },
        });

        await client.simulateTransaction(
            { transaction: TRANSACTION, skipChecks: true },
            { readMask: SimulateField.SUGGESTED_GAS_PRICE },
        );

        const [request] = requests;
        expect(request.transactions).toHaveLength(1);
        expect(request.transactions[0].transaction?.digest?.digest).toEqual(DIGEST);
        expect(request.transactions[0].txChecks).toEqual([
            SimulateTransactionItem_TransactionCheckModes.DISABLE_VM_CHECKS,
        ]);
        expect(request.readMask?.paths).toEqual(['suggested_gas_price']);
    });

    it('returns the simulated transaction with the metadata', async () => {
        const client = clientFor({
            simulateTransactions(_request, context) {
                sendMetadata(context);
                return { transactionResults: [simulated(1000n)] };
            },
        });

        const { body, metadata } = await client.simulateTransaction({ transaction: TRANSACTION });

        expect(body.suggestedGasPrice).toBe(1000n);
        expect(metadata).toMatchObject(METADATA);
    });

    it('throws the error of its slot', async () => {
        const client = clientFor({
            simulateTransactions() {
                return { transactionResults: [failed(Code.InvalidArgument, 'gas budget too low')] };
            },
        });

        await expect(client.simulateTransaction({ transaction: TRANSACTION })).rejects.toThrow(
            new ServerError(Code.InvalidArgument, 'gas budget too low'),
        );
    });

    it('rejects bytes that are not a TransactionData without calling the node', async () => {
        let called = false;
        const client = clientFor({
            simulateTransactions() {
                called = true;
                return {};
            },
        });

        await expect(
            client.simulateTransaction({ transaction: NOT_A_TRANSACTION }),
        ).rejects.toThrow(TypeError);
        expect(called).toBe(false);
    });

    it('maps a failed call to a TransportError', async () => {
        const client = clientFor({
            simulateTransactions() {
                throw new ConnectError('node is shutting down', Code.Unavailable);
            },
        });

        const error = await client
            .simulateTransaction({ transaction: TRANSACTION })
            .catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unavailable });
    });
});

describe('viewFunctionCalls', () => {
    it('sends each function with its type arguments as type tags, and the default read mask', async () => {
        const requests: ViewFunctionCallsRequest[] = [];
        const client = clientFor({
            viewFunctionCalls(request) {
                requests.push(request);
                return { callResults: [returned(), returned()] };
            },
        });

        await client.viewFunctionCalls([
            {
                fqFunctionName: PRICE,
                typeArgs: ['u8', 'vector<u64>', '0x2::coin::Coin<0x2::iota::IOTA>'],
            },
            { fqFunctionName: '0x1234::shop::stock' },
        ]);

        const [request] = requests;
        expect(request.viewFunctionCalls.map(({ fqFunctionName }) => fqFunctionName)).toEqual([
            PRICE,
            '0x1234::shop::stock',
        ]);
        expect(request.viewFunctionCalls[0].typeArgs).toMatchObject([
            { typeTag: { case: 'u8Tag', value: true } },
            {
                typeTag: {
                    case: 'vectorTag',
                    value: { innerType: { typeTag: { case: 'u64Tag', value: true } } },
                },
            },
            {
                typeTag: {
                    case: 'structTag',
                    value: { structTag: `${FRAMEWORK}::coin::Coin<${FRAMEWORK}::iota::IOTA>` },
                },
            },
        ]);
        expect(request.viewFunctionCalls[1].typeArgs).toEqual([]);
        expect(request.viewFunctionCalls[1].inputs).toEqual([]);
        expect(request.readMask?.paths).toEqual(
            normalizeReadMask(DEFAULT_READ_MASKS.viewFunctionCalls),
        );
    });

    it('sends JSON arguments with numbers as strings, and bytes as BCS', async () => {
        const requests: ViewFunctionCallsRequest[] = [];
        const client = clientFor({
            viewFunctionCalls(request) {
                requests.push(request);
                return { callResults: [returned()] };
            },
        });

        await client.viewFunctionCalls([
            {
                fqFunctionName: PRICE,
                args: [
                    100,
                    18_446_744_073_709_551_615n,
                    'text',
                    true,
                    null,
                    [1, 2],
                    { amount: 3 },
                    new Uint8Array([7, 8]),
                ],
            },
        ]);

        expect(requests[0].viewFunctionCalls[0].inputs).toMatchObject([
            { input: { case: 'json', value: { kind: { case: 'stringValue', value: '100' } } } },
            {
                input: {
                    case: 'json',
                    value: { kind: { case: 'stringValue', value: '18446744073709551615' } },
                },
            },
            { input: { case: 'json', value: { kind: { case: 'stringValue', value: 'text' } } } },
            { input: { case: 'json', value: { kind: { case: 'boolValue', value: true } } } },
            { input: { case: 'json', value: { kind: { case: 'nullValue', value: 0 } } } },
            {
                input: {
                    case: 'json',
                    value: {
                        kind: {
                            case: 'listValue',
                            value: {
                                values: [
                                    { kind: { case: 'stringValue', value: '1' } },
                                    { kind: { case: 'stringValue', value: '2' } },
                                ],
                            },
                        },
                    },
                },
            },
            {
                input: {
                    case: 'json',
                    value: {
                        kind: {
                            case: 'structValue',
                            value: {
                                fields: { amount: { kind: { case: 'stringValue', value: '3' } } },
                            },
                        },
                    },
                },
            },
            { input: { case: 'bcs', value: { data: new Uint8Array([7, 8]) } } },
        ]);
    });

    it('sends the given read mask', async () => {
        const requests: ViewFunctionCallsRequest[] = [];
        const client = clientFor({
            viewFunctionCalls(request) {
                requests.push(request);
                return { callResults: [returned()] };
            },
        });

        await client.viewFunctionCalls([{ fqFunctionName: PRICE }], {
            readMask: ViewFunctionCallField.EXECUTION_RESULT_RETURN_VALUES_JSON,
        });

        expect(requests[0].readMask?.paths).toEqual(['execution_result.return_values.json']);
    });

    it('returns one result per call, in order, with the metadata, an aborted call included', async () => {
        const client = clientFor({
            viewFunctionCalls(_request, context) {
                sendMetadata(context);
                return { callResults: [returned('75'), aborted()] };
            },
        });

        const { body, metadata } = await client.viewFunctionCalls([
            { fqFunctionName: PRICE },
            { fqFunctionName: PRICE },
        ]);

        expect(body.map((result) => result.ok && result.value.executionResult.case)).toEqual([
            'returnValues',
            'executionError',
        ]);
        expect(metadata).toMatchObject(METADATA);
    });

    it('keeps a refused call to its own slot', async () => {
        const client = clientFor({
            viewFunctionCalls() {
                return {
                    callResults: [
                        returned(),
                        failed(Code.InvalidArgument, 'not a #[view] function'),
                    ],
                };
            },
        });

        const { body } = await client.viewFunctionCalls([
            { fqFunctionName: PRICE },
            { fqFunctionName: '0x2::coin::value' },
        ]);

        expect(body.map((result) => result.ok)).toEqual([true, false]);
        const [, refused] = body;
        if (refused.ok) return;
        expect(refused.error).toBeInstanceOf(ServerError);
        expect(refused.error).toMatchObject({ code: Code.InvalidArgument });
    });

    it('rejects an empty request without calling the node', async () => {
        let called = false;
        const client = clientFor({
            viewFunctionCalls() {
                called = true;
                return {};
            },
        });

        await expect(client.viewFunctionCalls([])).rejects.toThrow(EmptyRequestError);
        expect(called).toBe(false);
    });

    it.each([
        ['a number a double cannot hold exactly', { args: [2 ** 53] }],
        ['a number that is not an integer', { args: [1.5] }],
        ['a malformed type argument', { typeArgs: ['not a type'] }],
    ])('rejects %s without calling the node', async (_what, call) => {
        let called = false;
        const client = clientFor({
            viewFunctionCalls() {
                called = true;
                return {};
            },
        });

        await expect(
            client.viewFunctionCalls([{ fqFunctionName: PRICE, ...call }]),
        ).rejects.toThrow(TypeError);
        expect(called).toBe(false);
    });

    it('rejects a different number of results than calls', async () => {
        const client = clientFor({
            viewFunctionCalls() {
                return { callResults: [] };
            },
        });

        await expect(client.viewFunctionCalls([{ fqFunctionName: PRICE }])).rejects.toThrow(
            new UnexpectedResultCountError(1, 0),
        );
    });

    it('maps a failed call to a TransportError', async () => {
        const client = clientFor({
            viewFunctionCalls() {
                throw new ConnectError('too many calls', Code.InvalidArgument);
            },
        });

        const error = await client
            .viewFunctionCalls([{ fqFunctionName: PRICE }])
            .catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.InvalidArgument, detail: 'too many calls' });
    });
});

describe('viewFunctionCall', () => {
    it('sends the one call with the given read mask', async () => {
        const requests: ViewFunctionCallsRequest[] = [];
        const client = clientFor({
            viewFunctionCalls(request) {
                requests.push(request);
                return { callResults: [returned()] };
            },
        });

        await client.viewFunctionCall(
            { fqFunctionName: PRICE, typeArgs: ['u64'], args: [100] },
            { readMask: ViewFunctionCallField.EXECUTION_RESULT_RETURN_VALUES_JSON },
        );

        const [request] = requests;
        expect(request.viewFunctionCalls).toHaveLength(1);
        expect(request.viewFunctionCalls[0]).toMatchObject({
            fqFunctionName: PRICE,
            typeArgs: [{ typeTag: { case: 'u64Tag', value: true } }],
            inputs: [
                { input: { case: 'json', value: { kind: { case: 'stringValue', value: '100' } } } },
            ],
        });
        expect(request.readMask?.paths).toEqual(['execution_result.return_values.json']);
    });

    it('returns what the function returned, with the metadata', async () => {
        const client = clientFor({
            viewFunctionCalls(_request, context) {
                sendMetadata(context);
                return { callResults: [returned('75')] };
            },
        });

        const { body, metadata } = await client.viewFunctionCall({ fqFunctionName: PRICE });

        expect(body.executionResult.case).toBe('returnValues');
        if (body.executionResult.case !== 'returnValues') return;
        expect(body.executionResult.value.outputs[0].json?.kind).toEqual({
            case: 'stringValue',
            value: '75',
        });
        expect(metadata).toMatchObject(METADATA);
    });

    it('returns a call that aborted as outputs, not as an error', async () => {
        const client = clientFor({
            viewFunctionCalls() {
                return { callResults: [aborted()] };
            },
        });

        const { body } = await client.viewFunctionCall({ fqFunctionName: PRICE });

        expect(body.executionResult.case).toBe('executionError');
    });

    it('throws the error of a call the node refused', async () => {
        const client = clientFor({
            viewFunctionCalls() {
                return { callResults: [failed(Code.InvalidArgument, 'not a #[view] function')] };
            },
        });

        await expect(
            client.viewFunctionCall({ fqFunctionName: '0x2::coin::value' }),
        ).rejects.toThrow(new ServerError(Code.InvalidArgument, 'not a #[view] function'));
    });

    it('rejects an empty function name without calling the node', async () => {
        let called = false;
        const client = clientFor({
            viewFunctionCalls() {
                called = true;
                return {};
            },
        });

        await expect(client.viewFunctionCall({ fqFunctionName: '' })).rejects.toThrow(
            EmptyRequestError,
        );
        expect(called).toBe(false);
    });

    it('maps a failed call to a TransportError', async () => {
        const client = clientFor({
            viewFunctionCalls() {
                throw new ConnectError('node is shutting down', Code.Unavailable);
            },
        });

        const error = await client
            .viewFunctionCall({ fqFunctionName: PRICE })
            .catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unavailable });
    });
});

function executed(digest: Uint8Array, checkpoint?: bigint) {
    return {
        result: {
            case: 'executedTransaction' as const,
            value: { transaction: { digest: { digest } }, checkpoint },
        },
    };
}

function simulated(suggestedGasPrice: bigint) {
    return {
        result: { case: 'simulatedTransaction' as const, value: { suggestedGasPrice } },
    };
}

/** A view call that ran and returned `json` as its one value. */
function returned(json = '1') {
    return {
        result: {
            case: 'callOutputs' as const,
            value: {
                executionResult: {
                    case: 'returnValues' as const,
                    value: {
                        outputs: [
                            { json: { kind: { case: 'stringValue' as const, value: json } } },
                        ],
                    },
                },
            },
        },
    };
}

/** A view call that ran and aborted. */
function aborted() {
    return {
        result: {
            case: 'callOutputs' as const,
            value: {
                executionResult: { case: 'executionError' as const, value: { source: 'abort' } },
            },
        },
    };
}

function failed(code: Code, message: string) {
    return { result: { case: 'error' as const, value: { code, message } } };
}
