// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

// Indexer retention window for filtered queries; older data requires archival point lookups.
export const INDEXER_RETENTION_DAYS = 30;

export const RETENTION_BANNER_TITLE = `Showing the last ${INDEXER_RETENTION_DAYS} days`;

export function getHistoryUnavailableMessage(subject: string): string {
    return `${subject} was deleted and its history is older than ${INDEXER_RETENTION_DAYS} days, so its details can no longer be displayed.`;
}
