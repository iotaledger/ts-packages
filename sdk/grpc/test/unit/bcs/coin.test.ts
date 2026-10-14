// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { create } from '@bufbuild/protobuf';
import { bcs, fromHex, toBase58 } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { decodeCoin } from '../../../src/bcs/decode.js';
import { MoveObjectType, VersionedObject } from '../../../src/bcs/object.js';
import { ProtoConversionError } from '../../../src/errors.js';
import { ObjectSchema } from '../../../src/proto/iota/grpc/v1/object_pb.js';

const FRAMEWORK = '0x0000000000000000000000000000000000000000000000000000000000000002';
const USDC_PACKAGE = '0x0000000000000000000000000000000000000000000000000000000000001234';
const COIN_ID = '0x0000000000000000000000000000000000000000000000000000000000000009';

/** Objects from mainnet, as the node sends them. */
const objects = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/objects.json'), 'utf8'),
).objects as { kind: string; objectId: string; bcs: string }[];

function fixture(kind: string) {
    const { objectId, bcs } = objects.find((object) => object.kind === kind)!;
    return { objectId, proto: create(ObjectSchema, { bcs: { data: fromHex(bcs) } }) };
}

/** A coin's contents: its `UID`, then the u64 of its `Balance`. */
const CONTENTS = new Uint8Array([...fromHex(COIN_ID), ...bcs.u64().serialize(5n).toBytes()]);

/** A struct object of the given type and contents, as the node sends it. */
function structObject(objectType: typeof MoveObjectType.$inferInput, contents: Uint8Array) {
    const data = VersionedObject.serialize({
        V1: {
            data: { Struct: { objectType, version: 1, contents } },
            owner: { AddressOwner: COIN_ID },
            previousTransaction: toBase58(new Uint8Array(32)),
            storageRebate: 0,
        },
    }).toBytes();

    return create(ObjectSchema, { bcs: { data } });
}

describe('decodeCoin', () => {
    it('reads a gas coin as a Coin<IOTA>', () => {
        expect(decodeCoin(structObject({ GasCoin: true }, CONTENTS))).toEqual({
            coinType: `${FRAMEWORK}::iota::IOTA`,
            id: COIN_ID,
            balance: 5n,
        });
    });

    it('reads the T of a Coin<T>', () => {
        expect(decodeCoin(structObject({ Coin: '0x1234::usdc::USDC' }, CONTENTS))).toEqual({
            coinType: `${USDC_PACKAGE}::usdc::USDC`,
            id: COIN_ID,
            balance: 5n,
        });
    });

    it('reads a struct spelled 0x2::coin::Coin<T> like a Coin<T>', () => {
        const spelledOut = {
            Other: {
                address: '0x2',
                module: 'coin',
                name: 'Coin',
                typeParams: [
                    { struct: { address: '0x1234', module: 'usdc', name: 'USDC', typeParams: [] } },
                ],
            },
        };

        expect(decodeCoin(structObject(spelledOut, CONTENTS)).coinType).toBe(
            `${USDC_PACKAGE}::usdc::USDC`,
        );
    });

    it.each(['Struct/GasCoin/Address', 'Struct/Coin/Address'])(
        'reads the id of a %s object from mainnet',
        (kind) => {
            const { objectId, proto } = fixture(kind);

            expect(decodeCoin(proto).id).toBe(objectId);
        },
    );

    it.each(['Package', 'Struct/Other/Address', 'Struct/StakedIota/Address'])(
        'rejects a %s object from mainnet as not a coin',
        (kind) => {
            expect(() => decodeCoin(fixture(kind).proto)).toThrow(
                new ProtoConversionError("invalid field 'coin': not a coin"),
            );
        },
    );

    it('rejects coin contents that are not a UID and a balance', () => {
        const padded = new Uint8Array([...CONTENTS, 0]);

        expect(() => decodeCoin(structObject({ GasCoin: true }, padded))).toThrow(
            new ProtoConversionError("invalid field 'coin': invalid content length"),
        );
    });

    it('rejects an object without its BCS', () => {
        expect(() => decodeCoin(create(ObjectSchema))).toThrow(ProtoConversionError);
    });
});
