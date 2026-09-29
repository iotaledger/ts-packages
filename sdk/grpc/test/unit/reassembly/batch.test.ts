// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { BinaryWriter, WireType } from '@bufbuild/protobuf/wire';
import { toBase58, toHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import {
    EmptyResponseFieldError,
    ServerError,
    UnexpectedEndOfStreamError,
    UnexpectedObjectError,
    UnexpectedResultCountError,
    UnexpectedTransactionError,
    UnknownVariantError,
} from '../../../src/errors.js';
import { StatusSchema } from '../../../src/proto/google/rpc/status_pb.js';
import type { GetObjectsResponse } from '../../../src/proto/iota/grpc/v1/ledger_service_pb.js';
import {
    GetObjectsResponseSchema,
    ObjectResultSchema,
    TransactionResultSchema,
} from '../../../src/proto/iota/grpc/v1/ledger_service_pb.js';
import type { Object$ } from '../../../src/proto/iota/grpc/v1/object_pb.js';
import { ObjectSchema } from '../../../src/proto/iota/grpc/v1/object_pb.js';
import type { ExecutedTransaction } from '../../../src/proto/iota/grpc/v1/transaction_pb.js';
import { ExecutedTransactionSchema } from '../../../src/proto/iota/grpc/v1/transaction_pb.js';
import {
    checkObjectIdentity,
    checkResultCount,
    checkTransactionIdentity,
    collectStream,
    toItemResult,
} from '../../../src/reassembly/batch.js';
import type { ItemResult } from '../../../src/results.js';

describe('toItemResult', () => {
    it('returns the object on success', () => {
        const object = create(ObjectSchema);
        const result = toItemResult(
            create(ObjectResultSchema, { result: { case: 'object', value: object } }),
            'object result',
        );

        expect(result).toEqual({ ok: true, value: object });
    });

    it('returns the executed transaction on success', () => {
        const transaction = create(ExecutedTransactionSchema);
        const result = toItemResult(
            create(TransactionResultSchema, {
                result: { case: 'executedTransaction', value: transaction },
            }),
            'transaction result',
        );

        expect(result).toEqual({ ok: true, value: transaction });
    });

    it('turns an error slot into a ServerError', () => {
        const result = toItemResult(
            create(ObjectResultSchema, {
                result: {
                    case: 'error',
                    value: create(StatusSchema, { code: 5, message: 'object not found' }),
                },
            }),
            'object result',
        );

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toBeInstanceOf(ServerError);
        expect(result.error).toMatchObject({ code: 5, detail: 'object not found' });
    });

    it('reports an empty result as a missing field', () => {
        const result = toItemResult(create(ObjectResultSchema), 'object result');

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toBeInstanceOf(EmptyResponseFieldError);
        expect(result.error).toMatchObject({ field: 'result' });
    });

    it('reports a variant this client does not know as unknown, not as missing', () => {
        // A newer server adding a success case to the oneof: field 3 is not in
        // this client's descriptor, so it decodes to `case: undefined` with the
        // bytes kept in `$unknown`.
        const bytes = new BinaryWriter()
            .tag(3, WireType.LengthDelimited)
            .bytes(new Uint8Array([1, 2, 3]))
            .finish();
        const message = fromBinary(ObjectResultSchema, bytes);
        expect(message.result.case).toBeUndefined();

        const result = toItemResult(message, 'object result');

        expect(result.ok).toBe(false);

        if (result.ok) {
            return;
        }

        expect(result.error).toBeInstanceOf(UnknownVariantError);
        expect(result.error).toMatchObject({ what: 'object result' });
    });

    it('does not count a known variant that round-tripped as unknown', () => {
        const message = fromBinary(
            ObjectResultSchema,
            toBinary(
                ObjectResultSchema,
                create(ObjectResultSchema, {
                    result: { case: 'object', value: create(ObjectSchema) },
                }),
            ),
        );

        expect(toItemResult(message, 'object result').ok).toBe(true);
    });
});

async function* frames<T>(...messages: T[]): AsyncGenerator<T> {
    for (const message of messages) {
        yield message;
    }
}

function objectsResponse(versions: bigint[], hasNext: boolean): GetObjectsResponse {
    return create(GetObjectsResponseSchema, {
        hasNext,
        objects: versions.map((version) =>
            create(ObjectResultSchema, {
                result: {
                    case: 'object',
                    value: create(ObjectSchema, { reference: { version } }),
                },
            }),
        ),
    });
}

function extractObjects(message: GetObjectsResponse) {
    return {
        hasNext: message.hasNext,
        items: message.objects.map((object) => toItemResult(object, 'object result')),
    };
}

describe('collectStream', () => {
    it('concatenates items across messages in order', async () => {
        const results = await collectStream(
            frames(
                objectsResponse([1n, 2n], true),
                objectsResponse([3n], true),
                objectsResponse([4n, 5n], false),
            ),
            extractObjects,
        );

        expect(results.map((result) => result.ok && result.value.reference?.version)).toEqual([
            1n,
            2n,
            3n,
            4n,
            5n,
        ]);
    });

    it('throws when the stream ends with hasNext still set', async () => {
        await expect(
            collectStream(
                frames(objectsResponse([1n], true), objectsResponse([2n], true)),
                extractObjects,
            ),
        ).rejects.toBeInstanceOf(UnexpectedEndOfStreamError);
    });

    it('returns an empty list for an empty stream', async () => {
        await expect(collectStream(frames<GetObjectsResponse>(), extractObjects)).resolves.toEqual(
            [],
        );
    });

    it('propagates an error from the source unchanged', async () => {
        const failure = new Error('connection reset');

        async function* failing(): AsyncGenerator<GetObjectsResponse> {
            yield objectsResponse([1n], true);
            throw failure;
        }

        await expect(collectStream(failing(), extractObjects)).rejects.toBe(failure);
    });

    it('propagates an error from extract unchanged', async () => {
        const failure = new Error('bad message');

        await expect(
            collectStream(frames(objectsResponse([1n], false)), () => {
                throw failure;
            }),
        ).rejects.toBe(failure);
    });
});

describe('checkResultCount', () => {
    it('accepts a matching count', () => {
        expect(() => checkResultCount([1, 2], 2)).not.toThrow();
    });

    it.each([
        { actual: [1], expected: 2 },
        { actual: [1, 2, 3], expected: 2 },
    ])('rejects $actual.length results for $expected requests', ({ actual, expected }) => {
        expect(() => checkResultCount(actual, expected)).toThrow(
            new UnexpectedResultCountError(expected, actual.length),
        );
    });
});

function id(byte: number): Uint8Array {
    return new Uint8Array(32).fill(byte);
}

function objectWithId(objectId: Uint8Array): ItemResult<Object$> {
    return { ok: true, value: create(ObjectSchema, { reference: { objectId: { objectId } } }) };
}

function transactionWithDigest(digest: Uint8Array): ItemResult<ExecutedTransaction> {
    return {
        ok: true,
        value: create(ExecutedTransactionSchema, { transaction: { digest: { digest } } }),
    };
}

const failedSlot = { ok: false, error: new ServerError(5, 'not found') } as const;

describe('checkObjectIdentity', () => {
    const a = id(0xaa);
    const b = id(0xbb);

    it('accepts objects answered in request order', () => {
        expect(() => checkObjectIdentity([objectWithId(a), objectWithId(b)], [a, b])).not.toThrow();
    });

    it('accepts the same object requested twice', () => {
        expect(() => checkObjectIdentity([objectWithId(a), objectWithId(a)], [a, a])).not.toThrow();
    });

    it('compares bytes, not array identity', () => {
        expect(() => checkObjectIdentity([objectWithId(id(0xaa))], [id(0xaa)])).not.toThrow();
    });

    it('rejects swapped objects at the first wrong position', () => {
        expect(() => checkObjectIdentity([objectWithId(b), objectWithId(a)], [a, b])).toThrow(
            new UnexpectedObjectError(0, `0x${toHex(a)}`, `0x${toHex(b)}`),
        );
    });

    it('reports the position of a mismatch past the first slot', () => {
        const c = id(0xcc);

        expect(() =>
            checkObjectIdentity([objectWithId(a), objectWithId(b), objectWithId(a)], [a, b, c]),
        ).toThrow(new UnexpectedObjectError(2, `0x${toHex(c)}`, `0x${toHex(a)}`));
    });

    it('rejects an id of a different length', () => {
        expect(() => checkObjectIdentity([objectWithId(a.subarray(0, 31))], [a])).toThrow(
            UnexpectedObjectError,
        );
    });

    it('skips error slots', () => {
        expect(() => checkObjectIdentity([failedSlot, objectWithId(b)], [a, b])).not.toThrow();
    });

    it('skips objects whose reference was masked out', () => {
        expect(() =>
            checkObjectIdentity([{ ok: true, value: create(ObjectSchema) }], [a]),
        ).not.toThrow();
    });
});

describe('checkTransactionIdentity', () => {
    const a = id(0x11);
    const b = id(0x22);

    it('accepts transactions answered in request order', () => {
        expect(() =>
            checkTransactionIdentity([transactionWithDigest(a), transactionWithDigest(b)], [a, b]),
        ).not.toThrow();
    });

    it('rejects swapped transactions with base58 digests in the error', () => {
        expect(() =>
            checkTransactionIdentity([transactionWithDigest(b), transactionWithDigest(a)], [a, b]),
        ).toThrow(new UnexpectedTransactionError(0, toBase58(a), toBase58(b)));
    });

    it('skips error slots', () => {
        expect(() =>
            checkTransactionIdentity([failedSlot, transactionWithDigest(b)], [a, b]),
        ).not.toThrow();
    });

    it('skips transactions whose digest was masked out', () => {
        expect(() =>
            checkTransactionIdentity(
                [
                    { ok: true, value: create(ExecutedTransactionSchema) },
                    {
                        ok: true,
                        value: create(ExecutedTransactionSchema, { transaction: {} }),
                    },
                ],
                [a, b],
            ),
        ).not.toThrow();
    });
});
