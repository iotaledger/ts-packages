// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { Client, Transport } from '@connectrpc/connect';
import { createClient } from '@connectrpc/connect';

import { LedgerService } from './proto/iota/grpc/v1/ledger_service_pb.js';
import type { GrpcNetwork } from './transport.js';
import { createGrpcNodeTransport } from './transport.js';

/** The server chunks at 4 MB when the client sends no limit of its own. */
export const DEFAULT_MAX_MESSAGE_SIZE_BYTES = 4 * 1024 * 1024;
export const MIN_MESSAGE_SIZE_BYTES = 1024 * 1024;
export const MAX_MESSAGE_SIZE_BYTES = 128 * 1024 * 1024;

/**
 * A named network, a url, or a transport you built yourself. Exactly one, the
 * same shape `IotaClientOptions` uses in the main SDK.
 */
export type IotaGrpcClientOptions = NetworkOrUrlOrTransport & {
    /**
     * The single decode limit this client works to. Methods that can be chunked
     * send it on every request, so the server and the client agree on one
     * number instead of each guessing.
     *
     * Not sent yet: no such method exists until the reassembly layers land.
     */
    maxMessageSizeBytes?: number;
};

type NetworkOrUrlOrTransport =
    | { network: GrpcNetwork; url?: never; transport?: never }
    | { url: string; network?: never; transport?: never }
    | { transport: Transport; network?: never; url?: never };

/**
 * A hidden property every client carries, so `isIotaGrpcClient` works even when
 * two copies of this package end up installed. `instanceof` does not: the class
 * from one copy is not the class from the other.
 */
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

    // The options type rules this out, but plain JavaScript callers do not.
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
     * Raw generated client. The reassembly layers wrap these.
     *
     * Built on first use and kept, so `client.ledger` is the same object every
     * time and services you never touch are never built.
     */
    get ledger(): Client<typeof LedgerService> {
        this.ledgerClient ??= createClient(LedgerService, this.transport);
        return this.ledgerClient;
    }
}
