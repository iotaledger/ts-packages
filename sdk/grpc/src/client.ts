// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { DescMessage, MessageInitShape, MessageShape } from '@bufbuild/protobuf';
import { clone, create, isMessage } from '@bufbuild/protobuf';
import type { CallOptions, Client, Transport } from '@connectrpc/connect';
import { createClient } from '@connectrpc/connect';
import { fromBase58, fromHex, toHex } from '@iota/bcs';
import { isValidIotaObjectId, normalizeIotaObjectId } from '@iota/iota-sdk/utils';

import { EmptyRequestError, ProtoConversionError, toIotaGrpcError } from './errors.js';
import type { ResponseMetadata } from './metadata.js';
import { parseResponseMetadata } from './metadata.js';
import type { Epoch } from './proto/iota/grpc/v1/epoch_pb.js';
import { EventFilterSchema, TransactionFilterSchema } from './proto/iota/grpc/v1/filter_pb.js';
import type {
    GetHealthResponse,
    GetServiceInfoResponse,
} from './proto/iota/grpc/v1/ledger_service_pb.js';
import { LedgerService } from './proto/iota/grpc/v1/ledger_service_pb.js';
import type { Object$ } from './proto/iota/grpc/v1/object_pb.js';
import type { ExecutedTransaction } from './proto/iota/grpc/v1/transaction_pb.js';
import { AddressSchema, ObjectIdSchema } from './proto/iota/grpc/v1/types_pb.js';
import type {
    CheckpointResponseField,
    ObjectField,
    ServiceInfoField,
    TransactionField,
} from './read-masks.js';
import { DEFAULT_READ_MASKS, EpochField, toReadMask } from './read-masks.js';
import {
    checkObjectIdentity,
    checkResultCount,
    checkTransactionIdentity,
    collectStream,
    extractObjects,
    extractTransactions,
} from './reassembly/batch.js';
import type { CheckpointResponse, CheckpointStreamItem } from './reassembly/checkpoint.js';
import { reassembleCheckpoints } from './reassembly/checkpoint.js';
import type { ItemResult, StreamWithMetadata, WithMetadata } from './results.js';
import { createGrpcNodeTransport } from './transport.js';
import type { GrpcNetwork } from './transport.js';

/** Copied from `iota-grpc-server/src/constants.rs`: the sizes the server accepts. */
export const DEFAULT_MAX_MESSAGE_SIZE_BYTES = 4 * 1024 * 1024;
export const MIN_MESSAGE_SIZE_BYTES = 1024 * 1024;
export const MAX_MESSAGE_SIZE_BYTES = 128 * 1024 * 1024;

/** Same shape as `IotaClientOptions` in the main SDK. */
export type IotaGrpcClientOptions = NetworkOrUrlOrTransport & {
    /** Sent with every batched or streamed read: above this size the server splits a response. */
    maxMessageSizeBytes?: number;
};

/** A network, a url, or a transport — never two. */
type NetworkOrUrlOrTransport =
    | { network: GrpcNetwork; url?: never; transport?: never }
    | { url: string; network?: never; transport?: never }
    | { transport: Transport; network?: never; url?: never };

type CheckpointOptions = {
    readMask?: CheckpointResponseField | readonly CheckpointResponseField[];
    transactionsFilter?: MessageInitShape<typeof TransactionFilterSchema>;
    eventsFilter?: MessageInitShape<typeof EventFilterSchema>;
    signal?: AbortSignal;
};

/** Survives two copies of this package being installed, where `instanceof` gives a silent false. */
const IOTA_GRPC_CLIENT_BRAND = Symbol.for('@iota/IotaGrpcClient');

export function isIotaGrpcClient(client: unknown): client is IotaGrpcClient {
    return (
        typeof client === 'object' &&
        client !== null &&
        Boolean(Reflect.get(client, IOTA_GRPC_CLIENT_BRAND))
    );
}

function resolveTransport(options: NetworkOrUrlOrTransport): Transport {
    if (options.transport !== undefined) {
        return options.transport;
    }

    if (options.url !== undefined) {
        return createGrpcNodeTransport({ url: options.url });
    }

    if (options.network !== undefined) {
        return createGrpcNodeTransport({ network: options.network });
    }

    // Unreachable from TypeScript, but plain JavaScript callers have no types.
    throw new TypeError('IotaGrpcClient needs one of: network, url or transport');
}

export class IotaGrpcClient {
    readonly maxMessageSizeBytes: number;

    protected transport: Transport;

    private ledgerClient: Client<typeof LedgerService> | undefined;

    get [IOTA_GRPC_CLIENT_BRAND]() {
        return true;
    }

    constructor(options: IotaGrpcClientOptions) {
        const maxMessageSizeBytes = options.maxMessageSizeBytes ?? DEFAULT_MAX_MESSAGE_SIZE_BYTES;

        if (
            maxMessageSizeBytes < MIN_MESSAGE_SIZE_BYTES ||
            maxMessageSizeBytes > MAX_MESSAGE_SIZE_BYTES
        ) {
            throw new RangeError(
                `maxMessageSizeBytes must be between ${MIN_MESSAGE_SIZE_BYTES} and ${MAX_MESSAGE_SIZE_BYTES}`,
            );
        }

        this.maxMessageSizeBytes = maxMessageSizeBytes;
        this.transport = resolveTransport(options);
    }

    /**
     * Raw generated client for the node's LedgerService. Not public: it hands
     * out frame streams, and reassembly must not be skippable.
     *
     * Built on first use, so services you never touch are never built.
     */
    protected get ledger(): Client<typeof LedgerService> {
        this.ledgerClient ??= createClient(LedgerService, this.transport);
        return this.ledgerClient;
    }

    /**
     * Checks that the node is serving recent checkpoints. Throws a `TransportError` with code
     * `UNAVAILABLE` when its latest checkpoint is older than `thresholdMs` (server default: 5s).
     */
    async getHealth(options?: {
        thresholdMs?: bigint;
        signal?: AbortSignal;
    }): Promise<WithMetadata<GetHealthResponse>> {
        const request = {
            thresholdMs: options?.thresholdMs,
        };

        return this.unary(
            (callOptions) => this.ledger.getHealth(request, callOptions),
            options?.signal,
        );
    }

    /** The node's chain, epoch, checkpoint heights and server version. */
    async getServiceInfo(options?: {
        readMask?: ServiceInfoField | readonly ServiceInfoField[];
        signal?: AbortSignal;
    }): Promise<WithMetadata<GetServiceInfoResponse>> {
        const request = {
            readMask: toReadMask(options?.readMask, DEFAULT_READ_MASKS.getServiceInfo),
        };

        return this.unary(
            (callOptions) => this.ledger.getServiceInfo(request, callOptions),
            options?.signal,
        );
    }

    /** The given epoch, or the current one when `epoch` is omitted. */
    async getEpoch(options?: {
        epoch?: bigint;
        readMask?: EpochField | readonly EpochField[];
        signal?: AbortSignal;
    }): Promise<WithMetadata<Epoch>> {
        const request = {
            epoch: options?.epoch,
            readMask: toReadMask(options?.readMask, DEFAULT_READ_MASKS.getEpoch),
        };

        const { body, metadata } = await this.unary(
            (callOptions) => this.ledger.getEpoch(request, callOptions),
            options?.signal,
        );

        if (body.epoch === undefined) {
            throw new ProtoConversionError("missing field 'epoch'");
        }

        return { body: body.epoch, metadata };
    }

    /** The current epoch's reference gas price, in NANOS. */
    async getReferenceGasPrice(options?: { signal?: AbortSignal }): Promise<WithMetadata<bigint>> {
        const request = {
            readMask: toReadMask([EpochField.REFERENCE_GAS_PRICE], []),
        };

        const { body, metadata } = await this.unary(
            (callOptions) => this.ledger.getEpoch(request, callOptions),
            options?.signal,
        );

        const referenceGasPrice = body.epoch?.referenceGasPrice;

        if (referenceGasPrice === undefined) {
            throw new ProtoConversionError("missing field 'reference_gas_price'");
        }

        return { body: referenceGasPrice, metadata };
    }

    /**
     * One result per ref, in request order. A missing object (never existed, deleted or pruned)
     * fails only its own slot with `NOT_FOUND`. Throws when the node answers with a different
     * count or a different object at some position.
     */
    async getObjects(
        refs: readonly (string | { objectId: string; version?: bigint })[],
        options?: { readMask?: ObjectField | readonly ObjectField[]; signal?: AbortSignal },
    ): Promise<WithMetadata<ItemResult<Object$>[]>> {
        if (refs.length === 0) {
            throw new EmptyRequestError();
        }

        const requested = refs.map((ref) => (typeof ref === 'string' ? { objectId: ref } : ref));
        const ids = requested.map(({ objectId }) => objectIdBytes(objectId));

        const request = {
            requests: {
                requests: requested.map(({ version }, i) => ({
                    objectRef: { objectId: { objectId: ids[i] }, version },
                })),
            },
            readMask: toReadMask(options?.readMask, DEFAULT_READ_MASKS.getObjects),
            maxMessageSizeBytes: this.maxMessageSizeBytes,
        };

        const { body, metadata } = await this.collect(
            (callOptions) => this.ledger.getObjects(request, callOptions),
            extractObjects,
            options?.signal,
        );

        checkResultCount(body, ids.length);
        checkObjectIdentity(body, ids);

        return { body, metadata };
    }

    /**
     * One result per digest, in request order. A transaction the node does not have fails only
     * its own slot with `NOT_FOUND`. Masks that include input or output objects, balance changes
     * or object changes fail a slot with `FAILED_PRECONDITION` once those objects are pruned.
     * Throws when the node answers with a different count or a different transaction at some
     * position.
     */
    async getTransactions(
        digests: readonly string[],
        options?: {
            readMask?: TransactionField | readonly TransactionField[];
            signal?: AbortSignal;
        },
    ): Promise<WithMetadata<ItemResult<ExecutedTransaction>[]>> {
        if (digests.length === 0) {
            throw new EmptyRequestError();
        }

        const digestsByteArrays = digests.map(digestBytes);

        const request = {
            requests: { requests: digestsByteArrays.map((digest) => ({ digest: { digest } })) },
            readMask: toReadMask(options?.readMask, DEFAULT_READ_MASKS.getTransactions),
            maxMessageSizeBytes: this.maxMessageSizeBytes,
        };

        const { body, metadata } = await this.collect(
            (callOptions) => this.ledger.getTransactions(request, callOptions),
            extractTransactions,
            options?.signal,
        );

        checkResultCount(body, digests.length);
        checkTransactionIdentity(body, digestsByteArrays);

        return { body, metadata };
    }

    /** The latest checkpoint, or the one with the given sequence number or digest. */
    async getCheckpoint(
        id?: { sequenceNumber: bigint } | { digest: string },
        options?: CheckpointOptions,
    ): Promise<WithMetadata<CheckpointResponse>> {
        let checkpointId:
            | { case: 'latest'; value: boolean }
            | { case: 'sequenceNumber'; value: bigint }
            | { case: 'digest'; value: { digest: Uint8Array } } = { case: 'latest', value: true };

        if (id !== undefined && 'sequenceNumber' in id) {
            checkpointId = { case: 'sequenceNumber', value: id.sequenceNumber };
        } else if (id !== undefined) {
            checkpointId = { case: 'digest', value: { digest: digestBytes(id.digest) } };
        }

        const request = {
            checkpointId,
            readMask: toReadMask(options?.readMask, DEFAULT_READ_MASKS.getCheckpoint),
            transactionsFilter: normalizeCheckpointFilter(
                TransactionFilterSchema,
                options?.transactionsFilter,
            ),
            eventsFilter: normalizeCheckpointFilter(EventFilterSchema, options?.eventsFilter),
            maxMessageSizeBytes: this.maxMessageSizeBytes,
        };

        let metadata: ResponseMetadata = {};
        try {
            const frames = this.ledger.getCheckpoint(request, {
                signal: options?.signal,
                onHeader: (headers) => (metadata = parseResponseMetadata(headers)),
            });

            for await (const item of reassembleCheckpoints(frames)) {
                if (item.kind === 'checkpoint') {
                    return { body: item, metadata };
                }
            }
        } catch (error) {
            throw toIotaGrpcError(error);
        }

        throw new ProtoConversionError("missing field 'checkpoint data'");
    }

    /**
     * Checkpoints from `startSequenceNumber` (default: the latest) up to `endSequenceNumber`
     * (default: unbounded, following the chain). With `filterCheckpoints`, only checkpoints with a
     * matching transaction or event are sent, and `progress` items report how far the node has
     * scanned in between. Nothing is requested until `items` is read.
     */
    streamCheckpoints(
        options?: CheckpointOptions & {
            startSequenceNumber?: bigint;
            endSequenceNumber?: bigint;
            filterCheckpoints?: boolean;
            progressIntervalMs?: number;
        },
    ): StreamWithMetadata<CheckpointStreamItem> {
        const request = {
            startSequenceNumber: options?.startSequenceNumber,
            endSequenceNumber: options?.endSequenceNumber,
            filterCheckpoints: options?.filterCheckpoints,
            progressIntervalMs: options?.progressIntervalMs,
            readMask: toReadMask(options?.readMask, DEFAULT_READ_MASKS.getCheckpoint),
            transactionsFilter: normalizeCheckpointFilter(
                TransactionFilterSchema,
                options?.transactionsFilter,
            ),
            eventsFilter: normalizeCheckpointFilter(EventFilterSchema, options?.eventsFilter),
            maxMessageSizeBytes: this.maxMessageSizeBytes,
        };

        const { promise: metadata, resolve, reject } = Promise.withResolvers<ResponseMetadata>();
        // Callers that only read `items` already see the error there.
        metadata.catch(() => undefined);

        // A generator, so the call starts on the first read: Connect sends a server-stream request
        // as soon as it is created, and one that fails unread is an unhandled rejection.
        const ledger = this.ledger;
        async function* items(): AsyncGenerator<CheckpointStreamItem> {
            let headersReceived = false;
            try {
                const frames = ledger.streamCheckpoints(request, {
                    signal: options?.signal,
                    onHeader: (headers) => {
                        headersReceived = true;
                        resolve(parseResponseMetadata(headers));
                    },
                });

                for await (const item of reassembleCheckpoints(frames)) {
                    if (item.kind === 'progress' && !options?.filterCheckpoints) {
                        continue;
                    }
                    yield item;
                }
            } catch (error) {
                const mapped = toIotaGrpcError(error);
                if (!headersReceived) {
                    reject(mapped);
                }
                throw mapped;
            }
        }

        return { items: items(), metadata };
    }

    private async unary<T>(
        call: (options: CallOptions) => Promise<T>,
        signal?: AbortSignal,
    ): Promise<WithMetadata<T>> {
        let metadata: ResponseMetadata = {};
        try {
            const body = await call({
                signal,
                onHeader: (headers) => (metadata = parseResponseMetadata(headers)),
            });
            return { body, metadata };
        } catch (error) {
            throw toIotaGrpcError(error);
        }
    }

    private async collect<M, I>(
        call: (options: CallOptions) => AsyncIterable<M>,
        extract: (message: M) => { hasNext: boolean; items: I[] },
        signal?: AbortSignal,
    ): Promise<WithMetadata<I[]>> {
        let metadata: ResponseMetadata = {};
        try {
            const body = await collectStream(
                call({
                    signal,
                    onHeader: (headers) => (metadata = parseResponseMetadata(headers)),
                }),
                extract,
            );
            return { body, metadata };
        } catch (error) {
            throw toIotaGrpcError(error);
        }
    }
}

function objectIdBytes(objectId: string): Uint8Array {
    const normalized = normalizeIotaObjectId(objectId);
    if (!isValidIotaObjectId(normalized)) {
        throw new TypeError(`invalid object ID: ${objectId}`);
    }
    return fromHex(normalized);
}

/** Left-pads every address and object ID to 32 bytes. */
function normalizeCheckpointFilter<Desc extends DescMessage>(
    schema: Desc,
    filter: MessageInitShape<Desc> | undefined,
): MessageShape<Desc> | undefined {
    if (filter === undefined) {
        return undefined;
    }

    const normalized = clone(schema, create(schema, filter));
    padIdentifiers(normalized);

    return normalized;
}

function padIdentifiers(value: unknown): void {
    if (typeof value !== 'object' || value === null || value instanceof Uint8Array) {
        return;
    }

    if (isMessage(value, AddressSchema)) {
        value.address = padTo32(value.address, 'address');
    } else if (isMessage(value, ObjectIdSchema)) {
        value.objectId = padTo32(value.objectId, 'object ID');
    }

    Object.values(value).forEach(padIdentifiers);
}

function padTo32(bytes: Uint8Array, what: string): Uint8Array {
    if (bytes.length > 32) {
        throw new TypeError(`invalid ${what} in filter: 0x${toHex(bytes)}`);
    }

    const padded = new Uint8Array(32);
    padded.set(bytes, 32 - bytes.length);

    return padded;
}

function digestBytes(digest: string): Uint8Array {
    let bytes: Uint8Array;
    try {
        bytes = fromBase58(digest);
    } catch {
        throw new TypeError(`invalid digest: ${digest}`);
    }
    if (bytes.length !== 32) {
        throw new TypeError(`invalid digest: ${digest}`);
    }
    return bytes;
}
