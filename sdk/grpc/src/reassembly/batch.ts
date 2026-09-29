// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { Message } from '@bufbuild/protobuf';
import type { ItemResult } from '../results.js';
import { EmptyResponseFieldError, ServerError, UnknownVariantError } from '../errors.js';
import type { Status } from '../proto/google/rpc/status_pb.js';

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

type ResultMessage = Message & {
    result: { case: string | undefined; value?: unknown };
};

type SuccessValue<M extends ResultMessage> = Exclude<
    M['result'],
    { case: 'error' } | { case: undefined }
>['value'];
