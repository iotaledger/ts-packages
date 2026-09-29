// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { Message } from '@bufbuild/protobuf';
import type { ItemResult } from '../results.js';
import {
    EmptyResponseFieldError,
    ServerError,
    UnexpectedEndOfStreamError,
    UnexpectedResultCountError,
    UnknownVariantError,
} from '../errors.js';
import type { Status } from '../proto/google/rpc/status_pb.js';

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
