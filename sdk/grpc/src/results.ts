// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaGrpcError } from './errors.js';
import type { ResponseMetadata } from './metadata.js';

export type ItemResult<T> = { ok: true; value: T } | { ok: false; error: IotaGrpcError };

export type Page<T> = { items: T[]; nextPageToken?: Uint8Array };

export type WithMetadata<T> = { body: T; metadata: ResponseMetadata };
