// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { CallOptions, Client, Transport } from '@connectrpc/connect';
import { createClient } from '@connectrpc/connect';
import { fromBase58, fromHex } from '@iota/bcs';
import { isValidIotaObjectId, normalizeIotaObjectId } from '@iota/iota-sdk/utils';

import { EmptyRequestError, ProtoConversionError, toIotaGrpcError } from './errors.js';
import type { ResponseMetadata } from './metadata.js';
import { parseResponseMetadata } from './metadata.js';
import type { Epoch } from './proto/iota/grpc/v1/epoch_pb.js';
import type {
    GetHealthResponse,
    GetServiceInfoResponse,
} from './proto/iota/grpc/v1/ledger_service_pb.js';
import { LedgerService } from './proto/iota/grpc/v1/ledger_service_pb.js';
import type { Object$ } from './proto/iota/grpc/v1/object_pb.js';
import type { ExecutedTransaction } from './proto/iota/grpc/v1/transaction_pb.js';
import type { ObjectField, ServiceInfoField, TransactionField } from './read-masks.js';
import { DEFAULT_READ_MASKS, EpochField, toReadMask } from './read-masks.js';
import {
    checkObjectIdentity,
    checkResultCount,
    checkTransactionIdentity,
    collectStream,
    extractObjects,
    extractTransactions,
} from './reassembly/batch.js';
import type { ItemResult, WithMetadata } from './results.js';
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

function digestBytes(digest: string): Uint8Array {
    let bytes: Uint8Array;
    try {
        bytes = fromBase58(digest);
    } catch {
        throw new TypeError(`invalid transaction digest: ${digest}`);
    }
    if (bytes.length !== 32) {
        throw new TypeError(`invalid transaction digest: ${digest}`);
    }
    return bytes;
}
