// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { HandlerContext, ServiceImpl, Transport } from '@connectrpc/connect';
import { Code, ConnectError, createRouterTransport } from '@connectrpc/connect';
import { toBase58 } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import {
    CheckpointResponseField,
    DataBeforeHeaderError,
    DEFAULT_READ_MASKS,
    EmptyRequestError,
    EpochField,
    IotaGrpcClient,
    normalizeReadMask,
    ObjectField,
    ProtoConversionError,
    ServerError,
    ServiceInfoField,
    SequenceNumberMismatchError,
    TransactionField,
    TransportError,
    UnexpectedEndOfStreamError,
    UnexpectedObjectError,
    UnexpectedResultCountError,
    UnexpectedTransactionError,
} from '../../src/index.js';
import type {
    GetCheckpointRequest,
    GetEpochRequest,
    GetHealthRequest,
    GetObjectsRequest,
    GetServiceInfoRequest,
    GetTransactionsRequest,
    StreamCheckpointsRequest,
} from '../../src/proto/iota/grpc/v1/ledger_service_pb.js';
import { LedgerService } from '../../src/proto/iota/grpc/v1/ledger_service_pb.js';

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

function clientFor(
    ledger: Partial<ServiceImpl<typeof LedgerService>>,
    options: { maxMessageSizeBytes?: number } = {},
) {
    return new IotaGrpcClient({
        ...options,
        transport: createRouterTransport(({ service }) => service(LedgerService, ledger)),
    });
}

describe('getHealth', () => {
    it('returns the body with the response metadata', async () => {
        const client = clientFor({
            getHealth(_request, context) {
                sendMetadata(context);
                return { executedCheckpointHeight: 1000n };
            },
        });

        const { body, metadata } = await client.getHealth();

        expect(body.executedCheckpointHeight).toBe(1000n);
        expect(metadata).toMatchObject(METADATA);
    });

    it('leaves the threshold to the server unless given one', async () => {
        const requests: GetHealthRequest[] = [];
        const client = clientFor({
            getHealth(request) {
                requests.push(request);
                return {};
            },
        });

        await client.getHealth();
        await client.getHealth({ thresholdMs: 30_000n });

        expect(requests.map((request) => request.thresholdMs)).toEqual([undefined, 30_000n]);
    });

    it('reports a stale node as UNAVAILABLE', async () => {
        const client = clientFor({
            getHealth() {
                throw new ConnectError('latest checkpoint is too old', Code.Unavailable);
            },
        });

        const error = await client.getHealth().catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({
            code: Code.Unavailable,
            detail: 'latest checkpoint is too old',
        });
    });
});

describe('getServiceInfo', () => {
    it('returns the body with the response metadata', async () => {
        const client = clientFor({
            getServiceInfo(_request, context) {
                sendMetadata(context);
                return { chain: 'testnet', epoch: 42n };
            },
        });

        const { body, metadata } = await client.getServiceInfo();

        expect(body).toMatchObject({ chain: 'testnet', epoch: 42n });
        expect(metadata).toMatchObject(METADATA);
    });

    it('sends the default read mask unless given one', async () => {
        const requests: GetServiceInfoRequest[] = [];
        const client = clientFor({
            getServiceInfo(request) {
                requests.push(request);
                return {};
            },
        });

        await client.getServiceInfo();
        await client.getServiceInfo({ readMask: ServiceInfoField.CHAIN_ID });
        await client.getServiceInfo({
            readMask: [ServiceInfoField.SERVER, ServiceInfoField.EPOCH],
        });

        expect(requests.map((request) => request.readMask?.paths)).toEqual([
            normalizeReadMask(DEFAULT_READ_MASKS.getServiceInfo),
            ['chain_id'],
            ['epoch', 'server'],
        ]);
    });
});

describe('getEpoch', () => {
    it('unwraps the epoch from the response', async () => {
        const client = clientFor({
            getEpoch(_request, context) {
                sendMetadata(context);
                return { epoch: { epoch: 42n, referenceGasPrice: 1000n } };
            },
        });

        const { body, metadata } = await client.getEpoch();

        expect(body).toMatchObject({ epoch: 42n, referenceGasPrice: 1000n });
        expect(metadata).toMatchObject(METADATA);
    });

    it('asks for the current epoch unless given one, including epoch 0', async () => {
        const requests: GetEpochRequest[] = [];
        const client = clientFor({
            getEpoch(request) {
                requests.push(request);
                return { epoch: {} };
            },
        });

        await client.getEpoch();
        await client.getEpoch({ epoch: 0n });
        await client.getEpoch({ epoch: 7n });

        expect(requests.map((request) => request.epoch)).toEqual([undefined, 0n, 7n]);
    });

    it('sends the default read mask unless given one', async () => {
        const requests: GetEpochRequest[] = [];
        const client = clientFor({
            getEpoch(request) {
                requests.push(request);
                return { epoch: {} };
            },
        });

        await client.getEpoch();
        await client.getEpoch({ readMask: [EpochField.EPOCH, EpochField.FIRST_CHECKPOINT] });

        expect(requests.map((request) => request.readMask?.paths)).toEqual([
            normalizeReadMask(DEFAULT_READ_MASKS.getEpoch),
            ['epoch', 'first_checkpoint'],
        ]);
    });

    it('rejects a response without an epoch', async () => {
        const client = clientFor({ getEpoch: () => ({}) });

        await expect(client.getEpoch()).rejects.toThrow(
            new ProtoConversionError("missing field 'epoch'"),
        );
    });
});

describe('getReferenceGasPrice', () => {
    it('asks for the reference gas price only and returns it', async () => {
        const requests: GetEpochRequest[] = [];
        const client = clientFor({
            getEpoch(request, context) {
                requests.push(request);
                sendMetadata(context);
                return { epoch: { referenceGasPrice: 1000n } };
            },
        });

        const { body, metadata } = await client.getReferenceGasPrice();

        expect(body).toBe(1000n);
        expect(metadata).toMatchObject(METADATA);
        expect(requests[0].epoch).toBeUndefined();
        expect(requests[0].readMask?.paths).toEqual(['reference_gas_price']);
    });

    it('rejects a response without a reference gas price', async () => {
        const client = clientFor({ getEpoch: () => ({ epoch: { epoch: 42n } }) });

        await expect(client.getReferenceGasPrice()).rejects.toThrow(
            new ProtoConversionError("missing field 'reference_gas_price'"),
        );
    });
});

describe('call errors', () => {
    it('maps an aborted call to CANCELED', async () => {
        const client = clientFor({ getServiceInfo: () => ({}) });

        const error = await client
            .getServiceInfo({ signal: AbortSignal.abort() })
            .catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Canceled });
    });

    it('maps an RPC the node does not serve to UNIMPLEMENTED', async () => {
        const client = clientFor({});

        const error = await client.getServiceInfo().catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unimplemented });
    });
});

/** A 32-byte value whose last byte is `last`, like the ID `0x…<last>` or a digest. */
function bytes32(last: number): Uint8Array {
    const bytes = new Uint8Array(32);
    bytes[31] = last;
    return bytes;
}

function objectResult(objectId: Uint8Array, version: bigint) {
    return {
        result: {
            case: 'object' as const,
            value: { reference: { objectId: { objectId }, version } },
        },
    };
}

function notFound(message: string) {
    return { result: { case: 'error' as const, value: { code: Code.NotFound, message } } };
}

function transactionResult(digest: Uint8Array) {
    return {
        result: {
            case: 'executedTransaction' as const,
            value: { transaction: { digest: { digest } } },
        },
    };
}

describe('getObjects', () => {
    it('rejects an empty request without calling the node', async () => {
        let called = false;
        const client = clientFor({
            async *getObjects() {
                called = true;
                yield* [];
            },
        });

        await expect(client.getObjects([])).rejects.toThrow(EmptyRequestError);
        expect(called).toBe(false);
    });

    it('rejects a malformed object ID without calling the node', async () => {
        let called = false;
        const client = clientFor({
            async *getObjects() {
                called = true;
                yield* [];
            },
        });

        await expect(client.getObjects(['0x2', 'not-an-id'])).rejects.toThrow(TypeError);
        expect(called).toBe(false);
    });

    it('sends padded 32-byte IDs, versions, the default read mask and the message size', async () => {
        const requests: GetObjectsRequest[] = [];
        const client = clientFor(
            {
                async *getObjects(request) {
                    requests.push(request);
                    yield {
                        hasNext: false,
                        objects: [objectResult(bytes32(2), 1n), objectResult(bytes32(5), 7n)],
                    };
                },
            },
            { maxMessageSizeBytes: 8 * 1024 * 1024 },
        );

        await client.getObjects(['0x2', { objectId: '0x5', version: 7n }]);

        const [request] = requests;
        expect(
            request.requests?.requests.map(({ objectRef }) => ({
                objectId: objectRef?.objectId?.objectId,
                version: objectRef?.version,
            })),
        ).toEqual([
            { objectId: bytes32(2), version: undefined },
            { objectId: bytes32(5), version: 7n },
        ]);
        expect(request.readMask?.paths).toEqual(normalizeReadMask(DEFAULT_READ_MASKS.getObjects));
        expect(request.maxMessageSizeBytes).toBe(8 * 1024 * 1024);
    });

    it('sends the given read mask', async () => {
        const requests: GetObjectsRequest[] = [];
        const client = clientFor({
            async *getObjects(request) {
                requests.push(request);
                yield { hasNext: false, objects: [objectResult(bytes32(2), 1n)] };
            },
        });

        await client.getObjects(['0x2'], { readMask: ObjectField.REFERENCE_OBJECT_ID });

        expect(requests[0].readMask?.paths).toEqual(['reference.object_id']);
    });

    it('concatenates results across messages, in request order, with the metadata', async () => {
        const client = clientFor({
            async *getObjects(_request, context) {
                sendMetadata(context);
                yield { hasNext: true, objects: [objectResult(bytes32(1), 10n)] };
                yield {
                    hasNext: false,
                    objects: [objectResult(bytes32(2), 20n), objectResult(bytes32(3), 30n)],
                };
            },
        });

        const { body, metadata } = await client.getObjects(['0x1', '0x2', '0x3']);

        expect(body.map((result) => result.ok && result.value.reference?.version)).toEqual([
            10n,
            20n,
            30n,
        ]);
        expect(metadata).toMatchObject(METADATA);
    });

    it('keeps a missing object to its own slot', async () => {
        const client = clientFor({
            async *getObjects() {
                yield {
                    hasNext: false,
                    objects: [
                        objectResult(bytes32(1), 10n),
                        notFound('object 0x2 not found'),
                        objectResult(bytes32(3), 30n),
                    ],
                };
            },
        });

        const { body } = await client.getObjects(['0x1', '0x2', '0x3']);

        expect(body.map((result) => result.ok)).toEqual([true, false, true]);
        const [, missing] = body;
        if (missing.ok) return;
        expect(missing.error).toBeInstanceOf(ServerError);
        expect(missing.error).toMatchObject({ code: Code.NotFound });
    });

    it('rejects a different number of results than requested', async () => {
        const client = clientFor({
            async *getObjects() {
                yield { hasNext: false, objects: [objectResult(bytes32(1), 10n)] };
            },
        });

        await expect(client.getObjects(['0x1', '0x2'])).rejects.toThrow(
            new UnexpectedResultCountError(2, 1),
        );
    });

    it('rejects an answer for a different object than requested', async () => {
        const client = clientFor({
            async *getObjects() {
                yield {
                    hasNext: false,
                    objects: [objectResult(bytes32(1), 10n), objectResult(bytes32(9), 20n)],
                };
            },
        });

        await expect(client.getObjects(['0x1', '0x2'])).rejects.toThrow(UnexpectedObjectError);
    });

    it('rejects a stream cut off while more results were promised', async () => {
        const client = clientFor({
            async *getObjects() {
                yield { hasNext: true, objects: [objectResult(bytes32(1), 10n)] };
            },
        });

        await expect(client.getObjects(['0x1', '0x2'])).rejects.toThrow(UnexpectedEndOfStreamError);
    });

    it('maps a failure part-way through the stream to a TransportError', async () => {
        const client = clientFor({
            async *getObjects() {
                yield { hasNext: true, objects: [objectResult(bytes32(1), 10n)] };
                throw new ConnectError('node is shutting down', Code.Unavailable);
            },
        });

        const error = await client.getObjects(['0x1', '0x2']).catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unavailable, detail: 'node is shutting down' });
    });
});

describe('getTransactions', () => {
    it('rejects an empty request without calling the node', async () => {
        let called = false;
        const client = clientFor({
            async *getTransactions() {
                called = true;
                yield* [];
            },
        });

        await expect(client.getTransactions([])).rejects.toThrow(EmptyRequestError);
        expect(called).toBe(false);
    });

    it('rejects a malformed digest without calling the node', async () => {
        let called = false;
        const client = clientFor({
            async *getTransactions() {
                called = true;
                yield* [];
            },
        });

        await expect(client.getTransactions(['0OIl'])).rejects.toThrow(TypeError);
        await expect(client.getTransactions([toBase58(new Uint8Array(31))])).rejects.toThrow(
            TypeError,
        );
        expect(called).toBe(false);
    });

    it('sends the digests, the default read mask and the message size', async () => {
        const requests: GetTransactionsRequest[] = [];
        const client = clientFor({
            async *getTransactions(request) {
                requests.push(request);
                yield {
                    hasNext: false,
                    transactionResults: [
                        transactionResult(bytes32(1)),
                        transactionResult(bytes32(2)),
                    ],
                };
            },
        });

        await client.getTransactions([toBase58(bytes32(1)), toBase58(bytes32(2))]);

        const [request] = requests;
        expect(request.requests?.requests.map(({ digest }) => digest?.digest)).toEqual([
            bytes32(1),
            bytes32(2),
        ]);
        expect(request.readMask?.paths).toEqual(
            normalizeReadMask(DEFAULT_READ_MASKS.getTransactions),
        );
        expect(request.maxMessageSizeBytes).toBe(client.maxMessageSizeBytes);
    });

    it('sends the given read mask', async () => {
        const requests: GetTransactionsRequest[] = [];
        const client = clientFor({
            async *getTransactions(request) {
                requests.push(request);
                yield { hasNext: false, transactionResults: [transactionResult(bytes32(1))] };
            },
        });

        await client.getTransactions([toBase58(bytes32(1))], {
            readMask: [TransactionField.EFFECTS, TransactionField.TRANSACTION_DIGEST],
        });

        expect(requests[0].readMask?.paths).toEqual(['effects', 'transaction.digest']);
    });

    it('concatenates results across messages, keeping a missing one to its slot', async () => {
        const client = clientFor({
            async *getTransactions(_request, context) {
                sendMetadata(context);
                yield { hasNext: true, transactionResults: [transactionResult(bytes32(1))] };
                yield {
                    hasNext: false,
                    transactionResults: [notFound('transaction not found')],
                };
            },
        });

        const { body, metadata } = await client.getTransactions([
            toBase58(bytes32(1)),
            toBase58(bytes32(2)),
        ]);

        expect(body.map((result) => result.ok)).toEqual([true, false]);
        expect(metadata).toMatchObject(METADATA);
    });

    it('rejects a different number of results than requested', async () => {
        const client = clientFor({
            async *getTransactions() {
                yield {
                    hasNext: false,
                    transactionResults: [
                        transactionResult(bytes32(1)),
                        transactionResult(bytes32(2)),
                    ],
                };
            },
        });

        await expect(client.getTransactions([toBase58(bytes32(1))])).rejects.toThrow(
            new UnexpectedResultCountError(1, 2),
        );
    });

    it('rejects an answer for a different transaction than requested', async () => {
        const client = clientFor({
            async *getTransactions() {
                yield { hasNext: false, transactionResults: [transactionResult(bytes32(9))] };
            },
        });

        await expect(client.getTransactions([toBase58(bytes32(1))])).rejects.toThrow(
            UnexpectedTransactionError,
        );
    });
});

const checkpointFrame = {
    header: (sequenceNumber: bigint) => ({
        payload: { case: 'checkpoint' as const, value: { sequenceNumber } },
    }),
    transactions: (count: number) => ({
        payload: {
            case: 'executedTransactions' as const,
            value: { executedTransactions: Array.from({ length: count }, () => ({})) },
        },
    }),
    events: (count: number) => ({
        payload: {
            case: 'events' as const,
            value: { events: Array.from({ length: count }, () => ({})) },
        },
    }),
    end: (sequenceNumber: bigint) => ({
        payload: { case: 'endMarker' as const, value: { sequenceNumber } },
    }),
    progress: (latestScannedSequenceNumber: bigint) => ({
        payload: { case: 'progress' as const, value: { latestScannedSequenceNumber } },
    }),
};

function checkpoint(sequenceNumber: bigint) {
    return [
        checkpointFrame.header(sequenceNumber),
        checkpointFrame.transactions(2),
        checkpointFrame.events(1),
        checkpointFrame.end(sequenceNumber),
    ];
}

const TRANSACTIONS_FILTER = {
    filter: { case: 'all' as const, value: { filters: [] } },
};

const EVENTS_FILTER = {
    filter: { case: 'sender' as const, value: { address: { address: bytes32(1) } } },
};

/** Fails every call before any response headers arrive, as a refused connection does. */
const REFUSING_TRANSPORT = {
    unary: () => Promise.reject(new ConnectError('connection refused', Code.Unavailable)),
    stream: () => Promise.reject(new ConnectError('connection refused', Code.Unavailable)),
} as unknown as Transport;

async function drain<T>(items: AsyncIterable<T>): Promise<T[]> {
    const collected: T[] = [];
    for await (const item of items) {
        collected.push(item);
    }
    return collected;
}

describe('getCheckpoint', () => {
    it('asks for the latest checkpoint unless given a sequence number or digest', async () => {
        const requests: GetCheckpointRequest[] = [];
        const client = clientFor({
            async *getCheckpoint(request) {
                requests.push(request);
                yield* checkpoint(0n);
            },
        });

        await client.getCheckpoint();
        await client.getCheckpoint({ sequenceNumber: 0n });
        await client.getCheckpoint({ digest: toBase58(bytes32(3)) });

        expect(requests.map((request) => request.checkpointId)).toEqual([
            { case: 'latest', value: true },
            { case: 'sequenceNumber', value: 0n },
            { case: 'digest', value: expect.objectContaining({ digest: bytes32(3) }) },
        ]);
    });

    it('rejects a malformed digest without calling the node', async () => {
        let called = false;
        const client = clientFor({
            async *getCheckpoint() {
                called = true;
                yield* [];
            },
        });

        await expect(client.getCheckpoint({ digest: '0OIl' })).rejects.toThrow(TypeError);
        expect(called).toBe(false);
    });

    it('sends the default read mask, the filters and the message size', async () => {
        const requests: GetCheckpointRequest[] = [];
        const client = clientFor({
            async *getCheckpoint(request) {
                requests.push(request);
                yield* checkpoint(7n);
            },
        });

        await client.getCheckpoint(undefined, {
            transactionsFilter: TRANSACTIONS_FILTER,
            eventsFilter: EVENTS_FILTER,
        });
        await client.getCheckpoint(undefined, {
            readMask: [CheckpointResponseField.TRANSACTIONS, CheckpointResponseField.EVENTS],
        });

        const [defaults, custom] = requests;
        expect(defaults.readMask?.paths).toEqual(
            normalizeReadMask(DEFAULT_READ_MASKS.getCheckpoint),
        );
        expect(defaults.transactionsFilter?.filter.case).toBe('all');
        expect(defaults.eventsFilter?.filter.case).toBe('sender');
        expect(defaults.maxMessageSizeBytes).toBe(client.maxMessageSizeBytes);
        expect(custom.readMask?.paths).toEqual(['events', 'transactions']);
    });

    it('reassembles the frames into one checkpoint, with the metadata', async () => {
        const client = clientFor({
            async *getCheckpoint(_request, context) {
                sendMetadata(context);
                yield* checkpoint(7n);
            },
        });

        const { body, metadata } = await client.getCheckpoint({ sequenceNumber: 7n });

        expect(body.sequenceNumber).toBe(7n);
        expect(body.checkpoint.sequenceNumber).toBe(7n);
        expect(body.transactions).toHaveLength(2);
        expect(body.events).toHaveLength(1);
        expect(metadata).toMatchObject(METADATA);
    });

    it('skips progress frames before the checkpoint', async () => {
        const client = clientFor({
            async *getCheckpoint() {
                yield checkpointFrame.progress(5n);
                yield* checkpoint(7n);
            },
        });

        const { body } = await client.getCheckpoint();

        expect(body.sequenceNumber).toBe(7n);
    });

    it('rejects a stream that ends without a checkpoint', async () => {
        const client = clientFor({
            async *getCheckpoint() {
                yield checkpointFrame.progress(5n);
            },
        });

        await expect(client.getCheckpoint()).rejects.toThrow(
            new ProtoConversionError("missing field 'checkpoint data'"),
        );
    });

    it('passes reassembly errors through unchanged', async () => {
        const client = clientFor({
            async *getCheckpoint() {
                yield checkpointFrame.header(7n);
                yield checkpointFrame.end(8n);
            },
        });

        await expect(client.getCheckpoint()).rejects.toThrow(SequenceNumberMismatchError);
    });

    it('maps a failure part-way through the stream to a TransportError', async () => {
        const client = clientFor({
            async *getCheckpoint() {
                yield checkpointFrame.header(7n);
                throw new ConnectError('node is shutting down', Code.Unavailable);
            },
        });

        const error = await client.getCheckpoint().catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unavailable });
    });
});

describe('streamCheckpoints', () => {
    it('sends the range, the options, the default read mask and the message size', async () => {
        const requests: StreamCheckpointsRequest[] = [];
        const client = clientFor({
            async *streamCheckpoints(request) {
                requests.push(request);
                yield* checkpoint(10n);
            },
        });

        await drain(client.streamCheckpoints().items);
        await drain(
            client.streamCheckpoints({
                startSequenceNumber: 0n,
                endSequenceNumber: 20n,
                filterCheckpoints: true,
                progressIntervalMs: 1000,
                transactionsFilter: TRANSACTIONS_FILTER,
                eventsFilter: EVENTS_FILTER,
                readMask: CheckpointResponseField.CHECKPOINT_SUMMARY,
            }).items,
        );

        const [defaults, custom] = requests;
        expect(defaults.startSequenceNumber).toBeUndefined();
        expect(defaults.endSequenceNumber).toBeUndefined();
        expect(defaults.maxMessageSizeBytes).toBe(client.maxMessageSizeBytes);
        expect(defaults.filterCheckpoints).toBeFalsy();
        expect(defaults.readMask?.paths).toEqual(
            normalizeReadMask(DEFAULT_READ_MASKS.getCheckpoint),
        );
        expect(custom).toMatchObject({
            startSequenceNumber: 0n,
            endSequenceNumber: 20n,
            filterCheckpoints: true,
            progressIntervalMs: 1000,
        });
        expect(custom.transactionsFilter?.filter.case).toBe('all');
        expect(custom.eventsFilter?.filter.case).toBe('sender');
        expect(custom.readMask?.paths).toEqual(['checkpoint.summary']);
    });

    it('yields reassembled checkpoints in order', async () => {
        const client = clientFor({
            async *streamCheckpoints() {
                yield* checkpoint(10n);
                yield* checkpoint(11n);
                yield* checkpoint(12n);
            },
        });

        const items = await drain(client.streamCheckpoints().items);

        expect(items.map((item) => item.kind === 'checkpoint' && item.sequenceNumber)).toEqual([
            10n,
            11n,
            12n,
        ]);
    });

    it('yields progress only when filtering checkpoints', async () => {
        const frames = () => [checkpointFrame.progress(9n), ...checkpoint(10n)];
        const client = clientFor({
            async *streamCheckpoints() {
                yield* frames();
            },
        });

        const unfiltered = await drain(client.streamCheckpoints().items);
        const filtered = await drain(client.streamCheckpoints({ filterCheckpoints: true }).items);

        expect(unfiltered.map((item) => item.kind)).toEqual(['checkpoint']);
        expect(filtered).toEqual([
            { kind: 'progress', latestScannedSequenceNumber: 9n },
            expect.objectContaining({ kind: 'checkpoint', sequenceNumber: 10n }),
        ]);
    });

    it('resolves the metadata once the stream is read', async () => {
        const client = clientFor({
            async *streamCheckpoints(_request, context) {
                sendMetadata(context);
                yield* checkpoint(10n);
            },
        });

        const stream = client.streamCheckpoints();
        await drain(stream.items);

        await expect(stream.metadata).resolves.toMatchObject(METADATA);
    });

    it('makes no call until the stream is read', async () => {
        let calls = 0;
        const client = clientFor({
            async *streamCheckpoints() {
                calls++;
                yield* checkpoint(10n);
            },
        });

        const stream = client.streamCheckpoints();
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(calls).toBe(0);

        await drain(stream.items);
        expect(calls).toBe(1);
    });

    it('rejects the metadata and the stream when the call fails before any headers', async () => {
        const client = new IotaGrpcClient({ transport: REFUSING_TRANSPORT });

        const stream = client.streamCheckpoints();
        const error = await drain(stream.items).catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unavailable });
        await expect(stream.metadata).rejects.toBeInstanceOf(TransportError);
    });

    it('leaves no unhandled rejection when the metadata is never awaited', async () => {
        const unhandled: unknown[] = [];
        const record = (reason: unknown) => unhandled.push(reason);
        process.on('unhandledRejection', record);

        try {
            const client = new IotaGrpcClient({ transport: REFUSING_TRANSPORT });
            await drain(client.streamCheckpoints().items).catch(() => undefined);
            await new Promise((resolve) => setTimeout(resolve, 10));
        } finally {
            process.off('unhandledRejection', record);
        }

        expect(unhandled).toEqual([]);
    });

    it('throws reassembly errors from the stream unchanged', async () => {
        const client = clientFor({
            async *streamCheckpoints() {
                yield checkpointFrame.events(1);
            },
        });

        await expect(drain(client.streamCheckpoints().items)).rejects.toThrow(
            DataBeforeHeaderError,
        );
    });

    it('maps a failure part-way through the stream to a TransportError', async () => {
        const client = clientFor({
            async *streamCheckpoints() {
                yield* checkpoint(10n);
                throw new ConnectError('node is shutting down', Code.Unavailable);
            },
        });

        const received: unknown[] = [];
        const error = await (async () => {
            for await (const item of client.streamCheckpoints().items) {
                received.push(item);
            }
        })().catch((error: unknown) => error);

        expect(received).toHaveLength(1);
        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unavailable });
    });

    it('stops when the signal aborts', async () => {
        const controller = new AbortController();
        const client = clientFor({
            async *streamCheckpoints() {
                for (let sequenceNumber = 10n; ; sequenceNumber++) {
                    yield* checkpoint(sequenceNumber);
                }
            },
        });

        const received: unknown[] = [];
        const error = await (async () => {
            for await (const item of client.streamCheckpoints({ signal: controller.signal })
                .items) {
                received.push(item);
                if (received.length === 2) {
                    controller.abort();
                }
            }
        })().catch((error: unknown) => error);

        expect(received).toHaveLength(2);
        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Canceled });
    });
});
