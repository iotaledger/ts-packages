// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { create, fromBinary } from '@bufbuild/protobuf';
import { BinaryWriter, WireType } from '@bufbuild/protobuf/wire';
import { describe, expect, it } from 'vitest';

import {
    DataBeforeHeaderError,
    EmptyResponseFieldError,
    IncompleteCheckpointError,
    IncompleteStreamError,
    SequenceNumberMismatchError,
    UnknownPayloadError,
} from '../../../src/errors.js';
import { EventSchema } from '../../../src/proto/iota/grpc/v1/event_pb.js';
import type { CheckpointData } from '../../../src/proto/iota/grpc/v1/ledger_service_pb.js';
import { CheckpointDataSchema } from '../../../src/proto/iota/grpc/v1/ledger_service_pb.js';
import { ExecutedTransactionSchema } from '../../../src/proto/iota/grpc/v1/transaction_pb.js';
import { reassembleCheckpoints } from '../../../src/reassembly/checkpoint.js';
import { collect, frames } from '../../frames.js';

function header(sequenceNumber?: bigint): CheckpointData {
    return create(CheckpointDataSchema, {
        payload: { case: 'checkpoint', value: { sequenceNumber } },
    });
}

function transactions(count: number): CheckpointData {
    return create(CheckpointDataSchema, {
        payload: {
            case: 'executedTransactions',
            value: {
                executedTransactions: Array.from({ length: count }, () =>
                    create(ExecutedTransactionSchema),
                ),
            },
        },
    });
}

function events(count: number): CheckpointData {
    return create(CheckpointDataSchema, {
        payload: {
            case: 'events',
            value: { events: Array.from({ length: count }, () => create(EventSchema)) },
        },
    });
}

function end(sequenceNumber?: bigint): CheckpointData {
    return create(CheckpointDataSchema, {
        payload: { case: 'endMarker', value: { sequenceNumber } },
    });
}

function progress(latestScannedSequenceNumber: bigint): CheckpointData {
    return create(CheckpointDataSchema, {
        payload: { case: 'progress', value: { latestScannedSequenceNumber } },
    });
}

function reassemble(...messages: CheckpointData[]) {
    return collect(reassembleCheckpoints(frames(...messages)));
}

describe('reassembleCheckpoints', () => {
    describe('complete checkpoints', () => {
        it('reassembles a quiet checkpoint: header, one transaction batch, end marker', async () => {
            const items = await reassemble(header(7n), transactions(2), end(7n));

            expect(items).toHaveLength(1);
            expect(items[0]).toMatchObject({ kind: 'checkpoint', sequenceNumber: 7n });
            expect(items[0].kind === 'checkpoint' && items[0].transactions).toHaveLength(2);
        });

        it('concatenates transaction and event batches split across messages', async () => {
            const [item] = await reassemble(
                header(7n),
                transactions(2),
                transactions(3),
                events(1),
                events(4),
                end(7n),
            );

            expect(item.kind).toBe('checkpoint');
            if (item.kind !== 'checkpoint') {
                return;
            }

            expect(item.transactions).toHaveLength(5);
            expect(item.events).toHaveLength(5);
        });

        it('keeps the header it was given', async () => {
            const first = header(7n);
            const [item] = await reassemble(first, end(7n));

            expect(item.kind === 'checkpoint' && item.checkpoint).toBe(first.payload.value);
        });

        it('yields a checkpoint with no data', async () => {
            const [item] = await reassemble(header(7n), end(7n));

            expect(item).toMatchObject({
                kind: 'checkpoint',
                sequenceNumber: 7n,
                transactions: [],
                events: [],
            });
        });

        it('handles the genesis checkpoint, sequence number 0', async () => {
            const items = await reassemble(header(0n), transactions(1), end(0n));

            expect(items).toHaveLength(1);
            expect(items[0]).toMatchObject({ kind: 'checkpoint', sequenceNumber: 0n });
        });

        it('does not carry data from one checkpoint into the next', async () => {
            const items = await reassemble(
                header(7n),
                transactions(2),
                events(3),
                end(7n),
                header(8n),
                transactions(1),
                end(8n),
            );

            expect(items.map((item) => item.kind === 'checkpoint' && item.sequenceNumber)).toEqual([
                7n,
                8n,
            ]);
            expect(items[1]).toMatchObject({ events: [] });
            expect(items[1].kind === 'checkpoint' && items[1].transactions).toHaveLength(1);
        });

        it('returns nothing for an empty stream', async () => {
            await expect(reassemble()).resolves.toEqual([]);
        });
    });

    describe('progress', () => {
        it('yields progress between checkpoints', async () => {
            const items = await reassemble(progress(5n), header(7n), end(7n), progress(9n));

            expect(items.map((item) => item.kind)).toEqual(['progress', 'checkpoint', 'progress']);
            expect(items[0]).toEqual({ kind: 'progress', latestScannedSequenceNumber: 5n });
        });

        it('yields progress inside a checkpoint without disturbing it', async () => {
            const items = await reassemble(
                header(7n),
                transactions(1),
                progress(7n),
                transactions(1),
                end(7n),
            );

            expect(items.map((item) => item.kind)).toEqual(['progress', 'checkpoint']);
            expect(items[1].kind === 'checkpoint' && items[1].transactions).toHaveLength(2);
        });
    });

    describe('empty and unknown payloads', () => {
        it('skips a message with no payload', async () => {
            const items = await reassemble(header(7n), create(CheckpointDataSchema), end(7n));

            expect(items).toHaveLength(1);
        });

        it('rejects a payload variant this client does not know', async () => {
            // A newer server adding a oneof case: field 99 is not in this
            // client's descriptor, so it decodes to `case: undefined` with the
            // bytes kept in `$unknown`.
            const bytes = new BinaryWriter()
                .tag(99, WireType.LengthDelimited)
                .bytes(new Uint8Array([1, 2, 3]))
                .finish();
            const unknown = fromBinary(CheckpointDataSchema, bytes);
            expect(unknown.payload.case).toBeUndefined();

            await expect(reassemble(header(7n), unknown, end(7n))).rejects.toBeInstanceOf(
                UnknownPayloadError,
            );
        });
    });

    describe('protocol violations', () => {
        it.each([
            { kind: 'transactions', message: transactions(1) },
            { kind: 'events', message: events(1) },
            { kind: 'end marker', message: end(7n) },
        ])('rejects $kind before any header', async ({ kind, message }) => {
            await expect(reassemble(message)).rejects.toThrow(new DataBeforeHeaderError(kind));
        });

        it('rejects data after an end marker and before the next header', async () => {
            await expect(reassemble(header(7n), end(7n), transactions(1))).rejects.toThrow(
                new DataBeforeHeaderError('transactions'),
            );
        });

        it('rejects a second header before the first checkpoint ended', async () => {
            await expect(
                reassemble(header(7n), transactions(1), header(8n)),
            ).rejects.toBeInstanceOf(IncompleteCheckpointError);
        });

        it('rejects an end marker for a different checkpoint', async () => {
            await expect(reassemble(header(7n), end(8n))).rejects.toThrow(
                new SequenceNumberMismatchError(7n, 8n),
            );
        });

        it('treats an end marker of 0 as a real sequence number', async () => {
            await expect(reassemble(header(7n), end(0n))).rejects.toThrow(
                new SequenceNumberMismatchError(7n, 0n),
            );
        });

        it('rejects a header without a sequence number', async () => {
            await expect(reassemble(header())).rejects.toBeInstanceOf(EmptyResponseFieldError);
        });

        it('rejects an end marker without a sequence number', async () => {
            await expect(reassemble(header(7n), end())).rejects.toBeInstanceOf(
                EmptyResponseFieldError,
            );
        });

        it('rejects a stream that ends mid-checkpoint', async () => {
            await expect(reassemble(header(7n), transactions(1))).rejects.toThrow(
                new IncompleteStreamError(7n),
            );
        });

        it('rejects a genesis checkpoint that never ends', async () => {
            await expect(reassemble(header(0n))).rejects.toThrow(new IncompleteStreamError(0n));
        });

        it('yields complete checkpoints before failing on a later one', async () => {
            const yielded: bigint[] = [];

            await expect(
                (async () => {
                    for await (const item of reassembleCheckpoints(
                        frames(header(7n), end(7n), header(8n), end(9n)),
                    )) {
                        if (item.kind === 'checkpoint') {
                            yielded.push(item.sequenceNumber);
                        }
                    }
                })(),
            ).rejects.toBeInstanceOf(SequenceNumberMismatchError);
            expect(yielded).toEqual([7n]);
        });
    });

    describe('the source stream', () => {
        it('propagates an error from the source unchanged', async () => {
            const failure = new Error('connection reset');

            async function* failing(): AsyncGenerator<CheckpointData> {
                yield header(7n);
                throw failure;
            }

            await expect(collect(reassembleCheckpoints(failing()))).rejects.toBe(failure);
        });

        it('closes the source when the consumer stops early', async () => {
            let closed = false;

            async function* source(): AsyncGenerator<CheckpointData> {
                try {
                    yield header(7n);
                    yield end(7n);
                    yield header(8n);
                    yield end(8n);
                } finally {
                    closed = true;
                }
            }

            for await (const item of reassembleCheckpoints(source())) {
                expect(item).toMatchObject({ sequenceNumber: 7n });
                break;
            }

            expect(closed).toBe(true);
        });
    });
});
