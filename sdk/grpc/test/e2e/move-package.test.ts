// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { toHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import type { GrpcNetwork } from '../../src/index.js';
import { IotaGrpcClient } from '../../src/index.js';

/** They run different node versions, so every method has to work on each of them. */
const NETWORKS: GrpcNetwork[] = ['mainnet', 'testnet', 'devnet'];

/** A system package: upgraded in place, so every version keeps this ID. */
const IOTA_FRAMEWORK = '0x0000000000000000000000000000000000000000000000000000000000000002';

function hexId(id: { objectId: Uint8Array } | undefined): string {
    return `0x${toHex(id!.objectId)}`;
}

describe.each(NETWORKS)('%s', (network) => {
    const client = new IotaGrpcClient({ network });

    describe('listPackageVersions', () => {
        it('returns a page of the versions of the framework package', async () => {
            const { body } = await client.listPackageVersions('0x2', { pageSize: 1 });

            expect(body.items).toHaveLength(1);
            expect(hexId(body.items[0].originalId)).toBe(IOTA_FRAMEWORK);
            expect(hexId(body.items[0].storageId)).toBe(IOTA_FRAMEWORK);
            expect(body.items[0].version).toBeGreaterThan(0n);
        });
    });

    describe('listAllPackageVersions', () => {
        it('collects every version of the framework package', async () => {
            const { body } = await client.listAllPackageVersions('0x2');

            expect(body.length).toBeGreaterThan(0);
            expect(body.every(({ originalId }) => hexId(originalId) === IOTA_FRAMEWORK)).toBe(true);
        });
    });
});
