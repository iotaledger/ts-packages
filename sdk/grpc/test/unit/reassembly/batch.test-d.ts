// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { create } from '@bufbuild/protobuf';
import { describe, expectTypeOf, it } from 'vitest';

import {
    ObjectResultSchema,
    TransactionResultSchema,
} from '../../../src/proto/iota/grpc/v1/ledger_service_pb.js';
import type { Object$ } from '../../../src/proto/iota/grpc/v1/object_pb.js';
import type { ExecutedTransaction } from '../../../src/proto/iota/grpc/v1/transaction_pb.js';
import { toItemResult } from '../../../src/reassembly/batch.js';
import type { ItemResult } from '../../../src/results.js';

// Fails if a regenerated proto adds a second success case to a result oneof,
// which would silently widen the value to a union.
describe('toItemResult types', () => {
    it('infers the success value from the message', () => {
        expectTypeOf(toItemResult(create(ObjectResultSchema), '')).toEqualTypeOf<
            ItemResult<Object$>
        >();

        expectTypeOf(toItemResult(create(TransactionResultSchema), '')).toEqualTypeOf<
            ItemResult<ExecutedTransaction>
        >();
    });
});
