// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@iota/iota-sdk/bcs';

import { versioned } from './versioned.js';

export const Event = bcs.struct('Event', {
    packageId: bcs.Address,
    module: bcs.string(),
    sender: bcs.Address,
    structTag: bcs.StructTag,
    contents: bcs.byteVector(),
});

export type Event = typeof Event.$inferType;

export const VersionedEvent = versioned('Event', Event);
export const TransactionEvents = bcs.vector(Event);
