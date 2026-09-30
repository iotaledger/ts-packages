// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { DEFAULT_READ_MASKS } from '../../src/read-masks.js';

/**
 * Read from the submodule the protos were generated from, so bumping it fails
 * here until the TypeScript defaults catch up.
 */
const READ_MASKS_RS = path.resolve(
    __dirname,
    '../../../../external/iota-rust-sdk/crates/iota-sdk-grpc-types/src/read_masks.rs',
);

const RUST_NAMES: Record<keyof typeof DEFAULT_READ_MASKS, string> = {
    getServiceInfo: 'GET_SERVICE_INFO_READ_MASK',
    getEpoch: 'GET_EPOCH_READ_MASK',
    getTransactions: 'GET_TRANSACTIONS_READ_MASK',
    getObjects: 'GET_OBJECTS_READ_MASK',
    getCheckpoint: 'GET_CHECKPOINT_READ_MASK',
    listDynamicFields: 'LIST_DYNAMIC_FIELDS_READ_MASK',
    listOwnedObjects: 'LIST_OWNED_OBJECTS_READ_MASK',
    executeTransactions: 'EXECUTE_TRANSACTIONS_READ_MASK',
    simulateTransactions: 'SIMULATE_TRANSACTIONS_READ_MASK',
    viewFunctionCalls: 'VIEW_FUNCTION_CALLS_READ_MASK',
};

function readRustDefaults(): Map<string, string[]> {
    const source = readFileSync(READ_MASKS_RS, 'utf8');
    const defaults = new Map<string, string[]>();

    for (const [, name, body] of source.matchAll(
        /pub const (\w+_READ_MASK): &str =\s*field_mask!\(([^)]*)\)/g,
    )) {
        defaults.set(
            name,
            [...body.matchAll(/"([^"]+)"/g)].map(([, p]) => p),
        );
    }

    return defaults;
}

describe('DEFAULT_READ_MASKS matches read_masks.rs', () => {
    const rust = readRustDefaults();

    it('parses every Rust default', () => {
        expect([...rust.keys()].sort()).toEqual(Object.values(RUST_NAMES).sort());
    });

    it.each(Object.entries(RUST_NAMES))('%s matches %s', (key, rustName) => {
        expect(DEFAULT_READ_MASKS[key as keyof typeof DEFAULT_READ_MASKS]).toEqual(
            rust.get(rustName),
        );
    });
});
