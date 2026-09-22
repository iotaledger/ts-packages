// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { Transport } from '@connectrpc/connect';
import { createGrpcTransport } from '@connectrpc/connect-node';

/**
 * The public gRPC endpoints. These are not the JSON-RPC ones, so they do not
 * come from the `IOTA_NETWORKS` env var the rest of the SDK reads.
 */
export const GRPC_URLS = {
    mainnet: 'https://grpc.mainnet.iota.cafe',
    testnet: 'https://grpc.testnet.iota.cafe',
    devnet: 'https://grpc.devnet.iota.cafe',
    localnet: 'http://localhost:50051',
} as const;

export type GrpcNetwork = keyof typeof GRPC_URLS;

export function getGrpcUrl(network: GrpcNetwork): string {
    return GRPC_URLS[network];
}

/** A named network, or a url. Never both. */
export type GrpcTransportOptions =
    | {
          network: GrpcNetwork;
          url?: never;
      }
    | {
          url: string;
          network?: never;
      };

/** Plain gRPC over HTTP/2. Works on Node, Bun and Deno. */
export function createGrpcNodeTransport(options: GrpcTransportOptions): Transport {
    return createGrpcTransport({
        baseUrl: options.url ?? getGrpcUrl(options.network),
    });
}

/**
 * Not supported yet.
 *
 * The public endpoints speak plain gRPC over HTTP/2 only: a gRPC-Web request
 * comes back as `application/grpc` with the status in trailers, and a CORS
 * preflight returns no `access-control-allow-origin`. Browser support needs a
 * `tonic-web` layer plus CORS on the node, which is tracked separately.
 *
 * Once that lands this becomes a `createGrpcWebTransport` call, and nothing
 * else in the client changes.
 */
export function createGrpcWebTransport(_options: GrpcTransportOptions): Transport {
    throw new Error(
        'browser transport is not supported yet: the public gRPC endpoints do not speak gRPC-Web',
    );
}
