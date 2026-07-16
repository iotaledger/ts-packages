// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

// The Indexer only serves filtered queries (by transaction kind, input/changed
// object, or event type) for data within this retention window. Older data is
// only available through point lookups backed by the archival store.
export const INDEXER_RETENTION_DAYS = 30;
