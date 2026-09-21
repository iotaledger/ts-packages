// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { Transport } from '@connectrpc/connect';
import { createGrpcTransport } from '@connectrpc/connect-node';

/** The public gRPC endpoints */
export const NETWORKS = {
    mainnet: 'https://grpc.mainnet.iota.cafe',
    testnet: 'https://grpc.testnet.iota.cafe',
    devnet: 'https://grpc.devnet.iota.cafe',
    localnet: 'http://localhost:50051',
} as const;

export type Network = keyof typeof NETWORKS;

export interface TransportOptions {
    /** A named public network, or use `baseUrl` for anything else. */
    network?: Network;
    baseUrl?: string;
}

function resolveBaseUrl({ network, baseUrl }: TransportOptions): string {
    if (baseUrl) return baseUrl;
    return NETWORKS[network ?? 'mainnet'];
}

/**
 * Plain gRPC over HTTP/2. Works on Node, Bun and Deno.
 */
export function createNodeTransport(options: TransportOptions = {}): Transport {
    return createGrpcTransport({ baseUrl: resolveBaseUrl(options) });
}

/**
 * Not supported yet.
 *
 * The public endpoints speak plain gRPC over HTTP/2 only: a gRPC-Web request
 * comes back as `application/grpc` with the status in trailers, and a CORS
 * preflight returns no `access-control-allow-origin`. Browser support needs a
 * `tonic-web` layer plus CORS on the node, which is tracked separately.
 *
 * Once that lands, this becomes a `createGrpcWebTransport` call and nothing
 * else in the client changes.
 */
export function createWebTransport(_options: TransportOptions = {}): never {
    throw new Error(
        'browser transport is not supported yet: the public gRPC endpoints do not speak gRPC-Web',
    );
}
