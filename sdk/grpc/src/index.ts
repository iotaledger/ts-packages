// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export * from './client.js';
export * from './errors.js';
export * from './transport.js';
export * from './read-masks.js';
export * from './metadata.js';
export * from './results.js';
export type { CheckpointResponse, CheckpointStreamItem } from './reassembly/checkpoint.js';
export * from './bcs/decode.js';

// Decoded BCS types, as the decoders return them.
export type { CheckpointContents, CheckpointSummary } from './bcs/checkpoint.js';
export type { Event as IotaEvent } from './bcs/event.js';
export type { ExecutionError } from './bcs/execution-error.js';
export type { IotaObject } from './bcs/object.js';
export type { ValidatorAggregatedSignature } from './bcs/signatures.js';

// Proto messages the client methods return, so callers can name them.
export type { Checkpoint } from './proto/iota/grpc/v1/checkpoint_pb.js';
export type { Epoch } from './proto/iota/grpc/v1/epoch_pb.js';
export type { Event } from './proto/iota/grpc/v1/event_pb.js';
export type {
    GetHealthResponse,
    GetServiceInfoResponse,
} from './proto/iota/grpc/v1/ledger_service_pb.js';
export type { Object$ } from './proto/iota/grpc/v1/object_pb.js';
export type { ExecutedTransaction } from './proto/iota/grpc/v1/transaction_pb.js';
