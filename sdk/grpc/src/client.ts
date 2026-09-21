// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { Client, Transport } from '@connectrpc/connect';
import { createClient } from '@connectrpc/connect';

import { LedgerService } from './proto/iota/grpc/v1/ledger_service_pb.js';
import type { Network, TransportOptions } from './transport.js';
import { createNodeTransport } from './transport.js';

/** The server chunks at 4 MB when the client sends no limit of its own. */
export const DEFAULT_MAX_MESSAGE_SIZE_BYTES = 4 * 1024 * 1024;
export const MIN_MESSAGE_SIZE_BYTES = 1024 * 1024;
export const MAX_MESSAGE_SIZE_BYTES = 128 * 1024 * 1024;

export interface IotaGrpcClientOptions extends TransportOptions {
    /** Bring your own transport. Overrides `network` and `baseUrl`. */
    transport?: Transport;
    /**
     * Sent on every request that can be chunked, so the server and this client
     * agree on one limit instead of each guessing.
     */
    maxMessageSizeBytes?: number;
}

export class IotaGrpcClient {
    readonly network: Network | undefined;
    readonly maxMessageSizeBytes: number;

    private readonly transport: Transport;

    constructor(options: IotaGrpcClientOptions = {}) {
        const { transport, maxMessageSizeBytes = DEFAULT_MAX_MESSAGE_SIZE_BYTES } = options;

        if (
            maxMessageSizeBytes < MIN_MESSAGE_SIZE_BYTES ||
            maxMessageSizeBytes > MAX_MESSAGE_SIZE_BYTES
        ) {
            throw new RangeError(
                `maxMessageSizeBytes must be between ${MIN_MESSAGE_SIZE_BYTES} and ${MAX_MESSAGE_SIZE_BYTES}`,
            );
        }

        this.network = options.network;
        this.maxMessageSizeBytes = maxMessageSizeBytes;
        this.transport = transport ?? createNodeTransport(options);
    }

    /** Raw generated client. The reassembly layers wrap these. */
    get ledger(): Client<typeof LedgerService> {
        return createClient(LedgerService, this.transport);
    }
}
