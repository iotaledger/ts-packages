// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@iota/iota-sdk/bcs';

import { versioned } from './versioned.js';

const i64 = bcs.u64().transform({
    input: (value: bigint) => BigInt.asUintN(64, value),
    output: (value) => BigInt.asIntN(64, BigInt(value)),
});

const CheckpointCommitment = bcs.enum('CheckpointCommitment', {
    EcmhLiveObjectSet: bcs.ObjectDigest,
});

const ValidatorCommitteeMember = bcs.struct('ValidatorCommitteeMember', {
    publicKey: bcs.byteVector(),
    stake: bcs.u64(),
});

const EndOfEpochData = bcs.struct('EndOfEpochData', {
    nextEpochCommittee: bcs.vector(ValidatorCommitteeMember),
    nextEpochProtocolVersion: bcs.u64(),
    epochCommitments: bcs.vector(CheckpointCommitment),
    epochSupplyChange: i64,
});

export const CheckpointSummary = bcs.struct('CheckpointSummary', {
    epoch: bcs.u64(),
    sequenceNumber: bcs.u64(),
    networkTotalTransactions: bcs.u64(),
    contentsDigest: bcs.ObjectDigest,
    previousDigest: bcs.option(bcs.ObjectDigest),
    epochRollingGasCostSummary: bcs.GasCostSummary,
    timestampMs: bcs.u64(),
    checkpointCommitments: bcs.vector(CheckpointCommitment),
    endOfEpochData: bcs.option(EndOfEpochData),
    versionSpecificData: bcs.byteVector(),
});

export type CheckpointSummary = typeof CheckpointSummary.$inferType;

export const VersionedCheckpointSummary = versioned('CheckpointSummary', CheckpointSummary);
