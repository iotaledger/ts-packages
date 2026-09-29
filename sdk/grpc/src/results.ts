// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaGrpcError } from './errors.js';

export type ItemResult<T> = { ok: true; value: T } | { ok: false; error: IotaGrpcError };
