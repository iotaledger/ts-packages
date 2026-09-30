// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export class IotaGrpcError extends Error {}

/** The server responded with an error for this item. */
export class ServerError extends IotaGrpcError {
    constructor(
        readonly code: number,
        readonly detail: string,
    ) {
        super(`server error (code ${code}): ${detail}`);
    }
}

/** The response could not be converted to our types. */
export class ProtoConversionError extends IotaGrpcError {
    constructor(detail: string) {
        super(`proto conversion error: ${detail}`);
    }
}

/** A signature could not be converted into proto format. */
export class SignatureConversionError extends IotaGrpcError {
    constructor(detail: string) {
        super(`signature conversion error: ${detail}`);
    }
}

/** The request did not contain any items. */
export class EmptyRequestError extends IotaGrpcError {
    constructor() {
        super('empty request: at least one item must be provided');
    }
}

/** The stream was cut off with has_next still marked. */
export class UnexpectedEndOfStreamError extends IotaGrpcError {
    constructor() {
        super('stream ended unexpectedly: server indicated more results with has_next=true');
    }
}

/** Network or gRPC transport failure. The message comes from the failure itself. */
export class TransportError extends IotaGrpcError {
    constructor(detail: string) {
        super(`grpc error: ${detail}`);
    }
}

/** The server answered something that does not match the contract. Base of a family. */
export class ProtocolError extends IotaGrpcError {
    constructor(message: string) {
        super(`protocol error: ${message}`);
    }
}

export class UnexpectedResultCountError extends ProtocolError {
    constructor(
        readonly expected: number,
        readonly actual: number,
    ) {
        super(`expected ${expected} results, got ${actual}`);
    }
}

export class UnexpectedObjectError extends ProtocolError {
    constructor(
        readonly position: number,
        readonly expected: string,
        readonly actual: string,
    ) {
        super(`requested object ${expected} at position ${position}, but got ${actual}`);
    }
}

export class UnexpectedTransactionError extends ProtocolError {
    constructor(
        readonly position: number,
        readonly expected: string,
        readonly actual: string,
    ) {
        super(`requested transaction ${expected} at position ${position}, but got ${actual}`);
    }
}

export class UnknownVariantError extends ProtocolError {
    constructor(readonly what: string) {
        super(`unknown ${what} variant`);
    }
}

export class EmptyResponseFieldError extends ProtocolError {
    constructor(readonly field: string) {
        super(`empty response field: ${field}`);
    }
}

/** Failures while reassembling a checkpoint stream. Base of a family. */
export class CheckpointStreamError extends ProtocolError {
    constructor(message: string) {
        super(`checkpoint stream error: ${message}`);
    }
}

export class DataBeforeHeaderError extends CheckpointStreamError {
    constructor(readonly dataKind: string) {
        super(`received ${dataKind} before checkpoint header`);
    }
}

export class IncompleteCheckpointError extends CheckpointStreamError {
    constructor() {
        super('new checkpoint header before previous completed');
    }
}

export class SequenceNumberMismatchError extends CheckpointStreamError {
    constructor(
        readonly expected: bigint,
        readonly actual: bigint,
    ) {
        super(`end marker sequence number ${actual} does not match checkpoint ${expected}`);
    }
}

export class UnknownPayloadError extends CheckpointStreamError {
    constructor() {
        super('unknown checkpoint data payload type');
    }
}

export class IncompleteStreamError extends CheckpointStreamError {
    constructor(readonly sequenceNumber: bigint) {
        super(`stream ended with incomplete data for checkpoint ${sequenceNumber}`);
    }
}
