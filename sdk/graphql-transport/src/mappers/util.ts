// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaTransactionKind } from '@iota/iota-sdk/client';

import { TransactionBlockKindInput } from '../generated/queries.js';

export function toShortTypeString<T extends string | null | undefined>(type?: T): T {
    return type?.replace(/0x0{31,}(\d)/g, '0x$1').replace(/,\b/g, ', ') as T;
}

export function isNumericString(value: string) {
    return /^-?\d+$/.test(value);
}

/** `TransactionDenyRulesUpdate` has no GraphQL counterpart. */
const TRANSACTION_KIND_TO_GRAPHQL: Record<
    IotaTransactionKind,
    TransactionBlockKindInput | undefined
> = {
    ProgrammableTransaction: TransactionBlockKindInput.ProgrammableTx,
    Genesis: TransactionBlockKindInput.Genesis,
    ConsensusCommitPrologueV1: TransactionBlockKindInput.ConsensusCommitPrologueV1,
    RandomnessStateUpdate: TransactionBlockKindInput.RandomnessStateUpdate,
    EndOfEpochTransaction: TransactionBlockKindInput.EndOfEpochTx,
    SystemTransaction: TransactionBlockKindInput.SystemTx,
    TransactionDenyRulesUpdate: undefined,
};

export function toGraphQLTransactionKind(
    kind: IotaTransactionKind,
): TransactionBlockKindInput | undefined {
    return TRANSACTION_KIND_TO_GRAPHQL[kind];
}
