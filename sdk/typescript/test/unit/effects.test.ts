// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@iota/bcs';
import { describe, expect, test } from 'vitest';

import { bcs } from '../../src/bcs';
import { normalizeIotaAddress } from '../../src/utils';

function failedEffects(error: unknown) {
    return {
        V1: {
            status: { Failed: { error, command: null } },
            executedEpoch: '1',
            gasUsed: {
                computationCost: '0',
                computationCostBurned: '0',
                storageCost: '0',
                storageRebate: '0',
                nonRefundableStorageFee: '0',
            },
            transactionDigest: toBase58(new Uint8Array(32).fill(1)),
            gasObjectIndex: null,
            eventsDigest: null,
            dependencies: [],
            lamportVersion: '2',
            changedObjects: [],
            unchangedSharedObjects: [],
            auxDataDigest: null,
        },
    } as Parameters<typeof bcs.TransactionEffects.serialize>[0];
}

describe('TransactionEffects BCS', () => {
    test('parses a transaction cancelled due to congestion with a suggested gas price', () => {
        const congestedObject = normalizeIotaAddress('0x5');
        const bytes = bcs.TransactionEffects.serialize(
            failedEffects({
                ExecutionCancelledDueToSharedObjectCongestionV2: {
                    congestedObjects: [congestedObject],
                    suggestedGasPrice: 2000n,
                },
            }),
        ).toBytes();

        // TransactionEffects::V1 = 0, ExecutionStatus::Failed = 1, and the variant index
        // of ExecutionCancelledDueToSharedObjectCongestionV2 in the Rust enum = 37
        expect(Array.from(bytes.slice(0, 3))).toEqual([0, 1, 37]);

        expect(bcs.TransactionEffects.parse(bytes).V1?.status.Failed?.error).toEqual({
            $kind: 'ExecutionCancelledDueToSharedObjectCongestionV2',
            ExecutionCancelledDueToSharedObjectCongestionV2: {
                congestedObjects: [congestedObject],
                suggestedGasPrice: '2000',
            },
        });
    });
});
