// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { Client, Transport } from '@connectrpc/connect';
import { createClient } from '@connectrpc/connect';

import { LedgerService } from './proto/iota/grpc/v1/ledger_service_pb.js';
import type { GrpcNetwork } from './transport.js';
import { createGrpcNodeTransport } from './transport.js';

/** Copied from `iota-grpc-server/src/constants.rs`: the sizes the server accepts. */
export const DEFAULT_MAX_MESSAGE_SIZE_BYTES = 4 * 1024 * 1024;
export const MIN_MESSAGE_SIZE_BYTES = 1024 * 1024;
export const MAX_MESSAGE_SIZE_BYTES = 128 * 1024 * 1024;

/** Same shape as `IotaClientOptions` in the main SDK. */
export type IotaGrpcClientOptions = NetworkOrUrlOrTransport & {
    /** Above this the server splits a response. Not sent yet: no method can be chunked until phase 1. */
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
     * out frame streams, and reassembly must not be skippable. Phase 1 wraps
     * these and exposes the methods flat on the client.
     *
     * Built on first use, so services you never touch are never built.
     */
    protected get ledger(): Client<typeof LedgerService> {
        this.ledgerClient ??= createClient(LedgerService, this.transport);
        return this.ledgerClient;
    }
}
