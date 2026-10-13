// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { toHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import type { GrpcNetwork } from '../../src/index.js';
import { IotaGrpcClient } from '../../src/index.js';

/** They run different node versions, so every method has to work on each of them. */
const NETWORKS: GrpcNetwork[] = ['mainnet', 'testnet', 'devnet'];

const IOTA_SYSTEM_STATE = '0x0000000000000000000000000000000000000000000000000000000000000005';

/** People burn coins by sending them to `0x0`, so it owns objects and coins on every network. */
const BURN_ADDRESS = '0x0';

function hexId(id: { objectId: Uint8Array } | undefined): string {
    return `0x${toHex(id!.objectId)}`;
}

describe.each(NETWORKS)('%s', (network) => {
    const client = new IotaGrpcClient({ network });

    describe('listOwnedObjects', () => {
        it('returns a page of objects, and a token for a page of others', async () => {
            const { body: first } = await client.listOwnedObjects(BURN_ADDRESS, { pageSize: 2 });
            expect(first.items).toHaveLength(2);
            expect(first.nextPageToken).toBeDefined();

            const { body: second } = await client.listOwnedObjects(BURN_ADDRESS, {
                pageSize: 2,
                pageToken: first.nextPageToken,
            });
            const firstIds = first.items.map(({ reference }) => hexId(reference?.objectId));
            for (const { reference } of second.items) {
                expect(firstIds).not.toContain(hexId(reference?.objectId));
            }
        });
    });

    describe('listAllOwnedObjects', () => {
        it('collects distinct objects across pages, up to the limit', async () => {
            const { body } = await client.listAllOwnedObjects(BURN_ADDRESS, {
                pageSize: 2,
                limit: 5,
            });

            const ids = body.map(({ reference }) => hexId(reference?.objectId));
            expect(new Set(ids).size).toBe(5);
        });
    });

    describe('listCoins', () => {
        it('returns a page of decoded coins', async () => {
            const { body } = await client.listCoins(BURN_ADDRESS, { pageSize: 5 });

            expect(body.items.length).toBeGreaterThan(0);
            for (const coin of body.items) {
                expect(coin.coinType).toMatch(/^0x[0-9a-f]{64}::\w+::\w+/);
                expect(coin.id).toMatch(/^0x[0-9a-f]{64}$/);
                expect(coin.balance).toBeTypeOf('bigint');
            }
        });
    });

    describe('listAllCoins', () => {
        it('collects only the coins of the type it is given', async () => {
            const {
                body: [{ coinType }],
            } = await client.listAllCoins(BURN_ADDRESS, { limit: 1 });

            const { body } = await client.listAllCoins(BURN_ADDRESS, { coinType, limit: 5 });

            expect(body.length).toBeGreaterThan(0);
            expect(body.every((coin) => coin.coinType === coinType)).toBe(true);
        });
    });

    describe('listDynamicFields', () => {
        it('returns a page of the fields of the system state object', async () => {
            const { body } = await client.listDynamicFields(IOTA_SYSTEM_STATE, { pageSize: 1 });

            expect(body.items).toHaveLength(1);
            expect(hexId(body.items[0].parent)).toBe(IOTA_SYSTEM_STATE);
        });
    });

    describe('listAllDynamicFields', () => {
        it('collects every field of the system state object', async () => {
            const { body } = await client.listAllDynamicFields(IOTA_SYSTEM_STATE);

            expect(body.length).toBeGreaterThan(0);
            expect(body.every(({ parent }) => hexId(parent) === IOTA_SYSTEM_STATE)).toBe(true);
        });
    });

    describe('getCoinInfo', () => {
        it('returns the metadata of IOTA', async () => {
            const { body } = await client.getCoinInfo('0x2::iota::IOTA');

            expect(body.metadata).toMatchObject({ symbol: 'IOTA', decimals: 9 });
        });
    });
});
