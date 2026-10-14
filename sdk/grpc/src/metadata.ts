// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { fromBase58 } from '@iota/bcs';

const X_IOTA_CHAIN_ID = 'x-iota-chain-id';
const X_IOTA_CHAIN = 'x-iota-chain';
const X_IOTA_CHECKPOINT_HEIGHT = 'x-iota-checkpoint-height';
const X_IOTA_LOWEST_AVAILABLE_CHECKPOINT = 'x-iota-lowest-available-checkpoint';
const X_IOTA_LOWEST_AVAILABLE_CHECKPOINT_OBJECTS = 'x-iota-lowest-available-checkpoint-objects';
const X_IOTA_EPOCH = 'x-iota-epoch';
const X_IOTA_TIMESTAMP_MS = 'x-iota-timestamp-ms';
const X_IOTA_TIMESTAMP = 'x-iota-timestamp';
const X_IOTA_SERVER = 'x-iota-server';

/** The `x-iota-*` headers every response carries. A field is unset when its header is missing or malformed. */
export type ResponseMetadata = {
    /** Base58 digest identifying the chain. */
    chainId?: string;
    /** Chain name, such as `mainnet`. */
    chain?: string;
    /** Current epoch. */
    epoch?: bigint;
    /** Current checkpoint height. */
    checkpointHeight?: bigint;
    /** Current chain time, in milliseconds since the Unix epoch. */
    timestampMs?: bigint;
    /** Current chain time, as RFC 3339. */
    timestamp?: string;
    /** Lowest checkpoint whose checkpoints, transactions, effects and events can still be read. */
    lowestAvailableCheckpoint?: bigint;
    /** Lowest checkpoint whose input and output objects can still be read. */
    lowestAvailableCheckpointObjects?: bigint;
    /** Server version, such as `iota-node/1.32.1`. */
    serverVersion?: string;
};

/** Reads the metadata from a response's headers, such as those passed to Connect's `onHeader`. */
export function parseResponseMetadata(headers: Headers): ResponseMetadata {
    return {
        chainId: parseDigest(headers.get(X_IOTA_CHAIN_ID)),
        chain: parseString(headers.get(X_IOTA_CHAIN)),
        epoch: parseU64(headers.get(X_IOTA_EPOCH)),
        checkpointHeight: parseU64(headers.get(X_IOTA_CHECKPOINT_HEIGHT)),
        timestampMs: parseU64(headers.get(X_IOTA_TIMESTAMP_MS)),
        timestamp: parseString(headers.get(X_IOTA_TIMESTAMP)),
        lowestAvailableCheckpoint: parseU64(headers.get(X_IOTA_LOWEST_AVAILABLE_CHECKPOINT)),
        lowestAvailableCheckpointObjects: parseU64(
            headers.get(X_IOTA_LOWEST_AVAILABLE_CHECKPOINT_OBJECTS),
        ),
        serverVersion: parseString(headers.get(X_IOTA_SERVER)),
    };
}

const U64_MAX = 2n ** 64n - 1n;

function parseU64(value: string | null): bigint | undefined {
    if (value === null || !/^\d+$/.test(value)) {
        return undefined;
    }

    const n = BigInt(value);
    return n <= U64_MAX ? n : undefined;
}

function parseString(value: string | null): string | undefined {
    return value ?? undefined;
}

const DIGEST_LENGTH = 32;

function parseDigest(value: string | null): string | undefined {
    if (value === null) {
        return undefined;
    }

    try {
        return fromBase58(value).length === DIGEST_LENGTH ? value : undefined;
    } catch {
        return undefined;
    }
}
