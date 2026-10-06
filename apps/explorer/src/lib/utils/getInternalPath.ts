// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export type InternalRoute =
    | 'epoch'
    | 'checkpoint'
    | 'address'
    | 'object'
    | 'txblock'
    | 'validator'
    | 'coin';

export function getInternalPath(route: InternalRoute, id: string): string {
    return `/${route}/${encodeURI(id)}`;
}
