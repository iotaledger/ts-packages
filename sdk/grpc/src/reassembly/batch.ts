// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { Message } from '@bufbuild/protobuf';
import { fromBase58, fromHex, toBase58, toHex } from '@iota/bcs';
import { TransactionDataBuilder } from '@iota/iota-sdk/transactions';

import { decodeObject, decodeTransaction, objectIdOf } from '../bcs/decode.js';
import {
    EmptyResponseFieldError,
    ServerError,
    UnexpectedEndOfStreamError,
    UnexpectedObjectError,
    UnexpectedResultCountError,
    UnexpectedTransactionError,
    UnknownVariantError,
} from '../errors.js';
import type { Status } from '../proto/google/rpc/status_pb.js';
import type { Object$ } from '../proto/iota/grpc/v1/object_pb.js';
import type { ExecutedTransaction } from '../proto/iota/grpc/v1/transaction_pb.js';
import type { ItemResult } from '../results.js';

type ResultMessage = Message & {
    result: { case: string | undefined; value?: unknown };
};

type SuccessValue<M extends ResultMessage> = Exclude<
    M['result'],
    { case: 'error' } | { case: undefined }
>['value'];

export function toItemResult<M extends ResultMessage>(
    message: M,
    what: string,
): ItemResult<SuccessValue<M>> {
    switch (message.result.case) {
        case 'error':
            const status = message.result.value as Status;
            return { ok: false, error: new ServerError(status.code, status.message) };
        case undefined:
            return {
                ok: false,
                error: message.$unknown?.length
                    ? new UnknownVariantError(what)
                    : new EmptyResponseFieldError('result'),
            };
        default:
            const result = message.result.value as SuccessValue<M>;

            return { ok: true, value: result };
    }
}

export async function collectStream<T, I>(
    stream: AsyncIterable<T>,
    extract: (message: T) => { hasNext: boolean; items: I[] },
): Promise<I[]> {
    const items: I[] = [];
    let hasNext = false;

    for await (const message of stream) {
        const batch = extract(message);

        for (const i of batch.items) {
            items.push(i);
        }

        hasNext = batch.hasNext;
    }

    if (hasNext) {
        throw new UnexpectedEndOfStreamError();
    }

    return items;
}

export function checkResultCount(results: unknown[], expected: number): void {
    if (results.length !== expected) {
        throw new UnexpectedResultCountError(expected, results.length);
    }
}

export function checkObjectIdentity(results: ItemResult<Object$>[], requested: Uint8Array[]): void {
    for (const [position, result] of results.entries()) {
        if (!result.ok) {
            continue;
        }

        const actual = answeredObjectId(result.value);

        if (actual === undefined) {
            continue;
        }

        const expected = requested[position];
        if (!bytesEqual(actual, expected)) {
            throw new UnexpectedObjectError(position, `0x${toHex(expected)}`, `0x${toHex(actual)}`);
        }
    }
}

export function checkTransactionIdentity(
    results: ItemResult<ExecutedTransaction>[],
    requested: Uint8Array[],
): void {
    for (const [position, result] of results.entries()) {
        if (!result.ok) {
            continue;
        }

        const actual = answeredTransactionDigest(result.value);

        if (actual === undefined) {
            continue;
        }

        const expected = requested[position];
        if (!bytesEqual(actual, expected)) {
            throw new UnexpectedTransactionError(position, toBase58(expected), toBase58(actual));
        }
    }
}

/** From the reference, or from the BCS when the read mask left the reference out. */
function answeredObjectId(object: Object$): Uint8Array | undefined {
    const id = object.reference?.objectId?.objectId;
    if (id !== undefined) {
        return id;
    }
    if (object.bcs !== undefined) {
        return fromHex(objectIdOf(decodeObject(object)));
    }
    return undefined;
}

/** From the response, or computed from the BCS when the read mask left the digest out. */
function answeredTransactionDigest(executed: ExecutedTransaction): Uint8Array | undefined {
    const { transaction } = executed;
    const digest = transaction?.digest?.digest;
    if (digest !== undefined) {
        return digest;
    }
    if (transaction?.bcs !== undefined) {
        // Rejects bytes that are not a TransactionData before hashing them, as Rust does.
        decodeTransaction(transaction);
        return fromBase58(TransactionDataBuilder.getDigestFromBytes(transaction.bcs.data));
    }
    return undefined;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((byte, i) => byte === b[i]);
}
