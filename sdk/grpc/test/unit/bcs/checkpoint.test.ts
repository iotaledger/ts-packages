// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bcs, fromHex, toHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { CheckpointSummary, VersionedCheckpointSummary } from '../../../src/bcs/checkpoint.js';
import { typeDigest } from '../../digest.js';

/**
 * A mid-epoch checkpoint summary and the last checkpoint of an epoch, the only
 * kind with end-of-epoch data. Each comes with what the checkpoint header, the
 * previous checkpoint, its transactions and `GetEpoch` for the next epoch say
 * about it.
 */
interface CheckpointFixture {
    sequenceNumber: string;
    epoch: string;
    summaryDigest: string;
    summaryBcs: string;
    contentsDigest: string;
    previousDigest: string;
    timestampMs: string;
}

interface CheckpointsFixture {
    recent: CheckpointFixture;
    endOfEpoch: CheckpointFixture & {
        nextEpoch: {
            firstCheckpoint: string;
            protocolVersion: string;
            committee: { publicKey: string; weight: string }[];
        };
    };
}

const fixture: CheckpointsFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/checkpoints.json'), 'utf8'),
);

describe.each([
    ['recent', fixture.recent],
    ['end-of-epoch', fixture.endOfEpoch],
] as const)('VersionedCheckpointSummary, %s checkpoint', (_, expected) => {
    const bytes = fromHex(expected.summaryBcs);
    const decoded = VersionedCheckpointSummary.parse(bytes);
    const summary = decoded.V1!;

    it('is the V1 variant', () => {
        expect(decoded.$kind).toBe('V1');
    });

    it('agrees with the checkpoint header and its neighbours', () => {
        expect(summary.sequenceNumber).toBe(expected.sequenceNumber);
        expect(summary.epoch).toBe(expected.epoch);
        expect(summary.contentsDigest).toBe(expected.contentsDigest);
        expect(summary.previousDigest).toBe(expected.previousDigest);
        expect(summary.timestampMs).toBe(expected.timestampMs);
    });

    it('hashes to the summary digest the server sent', () => {
        expect(
            typeDigest('CheckpointSummary', CheckpointSummary.serialize(summary).toBytes()),
        ).toBe(expected.summaryDigest);
    });

    it('re-encodes to the same bytes', () => {
        expect(toHex(VersionedCheckpointSummary.serialize(decoded).toBytes())).toBe(
            expected.summaryBcs,
        );
    });
});

describe('VersionedCheckpointSummary', () => {
    it('has no end-of-epoch data mid-epoch', () => {
        const summary = VersionedCheckpointSummary.parse(fromHex(fixture.recent.summaryBcs)).V1!;

        expect(summary.endOfEpochData).toBeNull();
    });

    it('rejects a version it does not know', () => {
        const bytes = fromHex(fixture.recent.summaryBcs);
        bytes[0] = 0x01;

        expect(() => VersionedCheckpointSummary.parse(bytes)).toThrow();
    });

    it('rejects truncated bytes', () => {
        const bytes = fromHex(fixture.recent.summaryBcs);

        expect(() => VersionedCheckpointSummary.parse(bytes.slice(0, -1))).toThrow();
    });
});

describe('end-of-epoch data', () => {
    const { nextEpoch } = fixture.endOfEpoch;
    const bytes = fromHex(fixture.endOfEpoch.summaryBcs);
    const summary = VersionedCheckpointSummary.parse(bytes).V1!;
    const endOfEpoch = summary.endOfEpochData!;

    it('closes the epoch right before the next one starts', () => {
        expect(BigInt(summary.sequenceNumber) + 1n).toBe(BigInt(nextEpoch.firstCheckpoint));
    });

    it('names the protocol version GetEpoch reports for the next epoch', () => {
        expect(endOfEpoch.nextEpochProtocolVersion).toBe(nextEpoch.protocolVersion);
    });

    it('lists the committee GetEpoch reports for the next epoch', () => {
        expect(
            endOfEpoch.nextEpochCommittee.map((member) => ({
                publicKey: toHex(member.publicKey),
                weight: member.stake,
            })),
        ).toEqual(nextEpoch.committee);
    });

    it('carries the live object set commitment', () => {
        expect(endOfEpoch.epochCommitments.map((commitment) => commitment.$kind)).toEqual([
            'EcmhLiveObjectSet',
        ]);
    });

    describe('epochSupplyChange', () => {
        const supplyChange = BigInt(endOfEpoch.epochSupplyChange);
        const offset = indexOf(bytes, bcs.u64().serialize(supplyChange).toBytes());

        it('decodes as a bigint', () => {
            expect(endOfEpoch.epochSupplyChange).toBeTypeOf('bigint');
        });

        it('appears once in the summary bytes', () => {
            expect(offset).toBeGreaterThan(-1);
            expect(
                indexOf(bytes.slice(offset + 1), bcs.u64().serialize(supplyChange).toBytes()),
            ).toBe(-1);
        });

        it('round-trips a negative change as 64-bit two’s complement', () => {
            const negative = {
                ...summary,
                endOfEpochData: { ...endOfEpoch, epochSupplyChange: -1n },
            };
            const encoded = VersionedCheckpointSummary.serialize({ V1: negative }).toBytes();

            expect(toHex(encoded.slice(offset, offset + 8))).toBe('ff'.repeat(8));
            expect(encoded.length).toBe(bytes.length);
            expect(
                VersionedCheckpointSummary.parse(encoded).V1!.endOfEpochData!.epochSupplyChange,
            ).toBe(-1n);
        });
    });
});

function indexOf(haystack: Uint8Array, needle: Uint8Array): number {
    return haystack.findIndex((_, start) =>
        needle.every((byte, i) => haystack[start + i] === byte),
    );
}
