// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bcs, fromHex, toHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { IotaObject, VersionedObject } from '../../../src/bcs/object.js';
import { typeDigest } from '../../digest.js';

/**
 * One object for each combination of data variant, compressed type and owner
 * variant, plus the `0x1` package, each with the reference the server sent
 * alongside. `kind` names the variants by the raw tags in the bytes, using the
 * ABNF's names.
 */
interface ObjectsFixture {
    objects: { kind: string; objectId: string; version: string; digest: string; bcs: string }[];
}

const fixture: ObjectsFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/objects.json'), 'utf8'),
);

/** The SDK's `Owner` names its variants differently from the Rust type. */
const OWNER_VARIANTS: Record<string, string> = {
    Address: 'AddressOwner',
    Object: 'ObjectOwner',
    Shared: 'Shared',
    Immutable: 'Immutable',
};

function sample(kind: string) {
    const found = fixture.objects.find((object) => object.kind === kind);
    if (!found) {
        throw new Error(`no '${kind}' object in the fixture`);
    }
    return { ...found, object: VersionedObject.parse(fromHex(found.bcs)).V1! };
}

describe.each(fixture.objects.map((object) => [object.kind, object] as const))(
    'VersionedObject, %s',
    (kind, expected) => {
        const bytes = fromHex(expected.bcs);
        const decoded = VersionedObject.parse(bytes);
        const object = decoded.V1!;
        const [dataKind, typeKind, ownerKind] = kind.split('/');

        it('is the V1 variant', () => {
            expect(decoded.$kind).toBe('V1');
        });

        it('hashes to the digest in the reference the server sent', () => {
            expect(typeDigest('Object', IotaObject.serialize(object).toBytes())).toBe(
                expected.digest,
            );
        });

        it('decodes to the variants its raw tags name', () => {
            expect(object.data.$kind).toBe(dataKind);
            if (object.data.$kind === 'Struct') {
                expect(object.data.Struct.objectType.$kind).toBe(typeKind);
                expect(object.owner.$kind).toBe(OWNER_VARIANTS[ownerKind]);
            } else {
                expect(object.owner.$kind).toBe('Immutable');
            }
        });

        it('carries the id and version of its reference', () => {
            if (object.data.$kind === 'Struct') {
                const { contents, version } = object.data.Struct;
                expect(`0x${toHex(contents.slice(0, 32))}`).toBe(expected.objectId);
                expect(version).toBe(expected.version);
            } else {
                expect(object.data.Package.id).toBe(expected.objectId);
                expect(object.data.Package.version).toBe(expected.version);
            }
        });

        it('re-encodes to the same bytes', () => {
            expect(toHex(VersionedObject.serialize(decoded).toBytes())).toBe(expected.bcs);
        });
    },
);

describe('Move struct contents', () => {
    it('holds a GasCoin as its id and balance', () => {
        const { object } = sample('Struct/GasCoin/Address');

        expect(object.data.Struct!.contents).toHaveLength(32 + 8);
    });

    it('holds a StakedIota as its id, pool id, activation epoch and principal', () => {
        const { object } = sample('Struct/StakedIota/Address');

        expect(object.data.Struct!.contents).toHaveLength(32 + 32 + 8 + 8);
    });

    it('names the coin type of a non-IOTA Coin', () => {
        const { object } = sample('Struct/Coin/Address');
        const coinType = object.data.Struct!.objectType.Coin!;

        expect(coinType).toMatch(/^0x[0-9a-f]{64}::\w+::\w+/);
        expect(object.data.Struct!.contents).toHaveLength(32 + 8);
    });
});

describe('Move package', () => {
    const { object, objectId } = sample('Package');
    const pkg = object.data.Package!;

    it('keeps its modules in canonical BCS map order, sorted by encoded key', () => {
        const names = [...pkg.modules.keys()];
        const encoded = (name: string) => toHex(bcs.string().serialize(name).toBytes());

        expect(names.length).toBeGreaterThan(0);
        expect(names).toEqual(
            [...names].sort((a, b) =>
                encoded(a) < encoded(b) ? -1 : encoded(a) > encoded(b) ? 1 : 0,
            ),
        );
        expect(names).toContain('vector');
    });

    it('defines its own types in the type origin table', () => {
        expect(pkg.typeOriginTable.length).toBeGreaterThan(0);
        expect(pkg.typeOriginTable.every((origin) => origin.package === objectId)).toBe(true);
    });

    it('links nothing, as the Move standard library', () => {
        expect(pkg.linkageTable.size).toBe(0);
    });
});

describe('VersionedObject', () => {
    it('rejects a version it does not know', () => {
        const bytes = fromHex(fixture.objects[0].bcs);
        bytes[0] = 0x01;

        expect(() => VersionedObject.parse(bytes)).toThrow();
    });

    it('rejects truncated bytes', () => {
        const bytes = fromHex(fixture.objects[0].bcs);

        expect(() => VersionedObject.parse(bytes.slice(0, -1))).toThrow();
    });
});
