// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaGrpcError } from './errors.js';
import type { ResponseMetadata } from './metadata.js';

export type ItemResult<T> = { ok: true; value: T } | { ok: false; error: IotaGrpcError };

export type Page<T> = { items: T[]; nextPageToken?: Uint8Array };

export type WithMetadata<T> = { body: T; metadata: ResponseMetadata };

/**
 * A stream whose metadata arrives with its first response. `metadata` settles once reading `items`
 * has started, and rejects with the stream's error when the call fails before any headers arrive.
 */
export type StreamWithMetadata<T> = {
    items: AsyncIterable<T>;
    metadata: Promise<ResponseMetadata>;
};
