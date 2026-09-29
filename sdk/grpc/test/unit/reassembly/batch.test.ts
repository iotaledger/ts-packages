// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { BinaryWriter, WireType } from '@bufbuild/protobuf/wire';
import { describe, expect, it } from 'vitest';

import { EmptyResponseFieldError, ServerError, UnknownVariantError } from '../../../src/errors.js';
import { StatusSchema } from '../../../src/proto/google/rpc/status_pb.js';
import {
    ObjectResultSchema,
    TransactionResultSchema,
} from '../../../src/proto/iota/grpc/v1/ledger_service_pb.js';
import { ObjectSchema } from '../../../src/proto/iota/grpc/v1/object_pb.js';
import { ExecutedTransactionSchema } from '../../../src/proto/iota/grpc/v1/transaction_pb.js';
import { toItemResult } from '../../../src/reassembly/batch.js';

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
