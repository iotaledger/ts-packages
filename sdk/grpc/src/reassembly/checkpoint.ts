// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    DataBeforeHeaderError,
    EmptyResponseFieldError,
    IncompleteCheckpointError,
    IncompleteStreamError,
    SequenceNumberMismatchError,
    UnknownPayloadError,
} from '../errors.js';
import type { Checkpoint } from '../proto/iota/grpc/v1/checkpoint_pb.js';
import type { Event } from '../proto/iota/grpc/v1/event_pb.js';
import type { CheckpointData } from '../proto/iota/grpc/v1/ledger_service_pb.js';
import type { ExecutedTransaction } from '../proto/iota/grpc/v1/transaction_pb.js';

export type CheckpointStreamItem =
    | {
          kind: 'checkpoint';
          sequenceNumber: bigint;
          checkpoint: Checkpoint;
          transactions: ExecutedTransaction[];
          events: Event[];
      }
    | { kind: 'progress'; latestScannedSequenceNumber: bigint };

export async function* reassembleCheckpoints(
    frames: AsyncIterable<CheckpointData>,
): AsyncGenerator<CheckpointStreamItem> {
    let current:
        | {
              header: Checkpoint;
              sequenceNumber: bigint;
              transactions: ExecutedTransaction[];
              events: Event[];
          }
        | undefined;

    for await (const frame of frames) {
        switch (frame.payload.case) {
            case 'checkpoint': {
                const header = frame.payload.value;
                const { sequenceNumber } = header;

                if (sequenceNumber === undefined) {
                    throw new EmptyResponseFieldError('checkpoint.sequence_number');
                }

                if (current !== undefined) {
                    throw new IncompleteCheckpointError();
                }

                current = { header, sequenceNumber, transactions: [], events: [] };
                break;
            }
            case 'executedTransactions': {
                if (current === undefined) {
                    throw new DataBeforeHeaderError('transactions');
                }

                for (const transaction of frame.payload.value.executedTransactions) {
                    current.transactions.push(transaction);
                }

                break;
            }
            case 'events': {
                if (current === undefined) {
                    throw new DataBeforeHeaderError('events');
                }

                for (const event of frame.payload.value.events) {
                    current.events.push(event);
                }

                break;
            }
            case 'endMarker': {
                if (current === undefined) {
                    throw new DataBeforeHeaderError('end marker');
                }

                const endMarker = frame.payload.value;

                if (endMarker.sequenceNumber === undefined) {
                    throw new EmptyResponseFieldError('end_marker.sequence_number');
                }

                if (endMarker.sequenceNumber !== current.sequenceNumber) {
                    throw new SequenceNumberMismatchError(
                        current.sequenceNumber,
                        endMarker.sequenceNumber,
                    );
                }

                yield {
                    kind: 'checkpoint',
                    sequenceNumber: current.sequenceNumber,
                    checkpoint: current.header,
                    transactions: current.transactions,
                    events: current.events,
                };

                current = undefined;
                break;
            }
            case 'progress': {
                yield {
                    kind: 'progress',
                    latestScannedSequenceNumber: frame.payload.value.latestScannedSequenceNumber,
                };
                break;
            }
            case undefined: {
                if (frame.$unknown?.length) {
                    throw new UnknownPayloadError();
                }

                break;
            }
        }
    }

    if (current !== undefined) {
        throw new IncompleteStreamError(current.sequenceNumber);
    }
}
