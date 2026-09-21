// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
    CheckpointStreamError,
    DataBeforeHeaderError,
    EmptyRequestError,
    EmptyResponseFieldError,
    IncompleteCheckpointError,
    IncompleteStreamError,
    IotaGrpcError,
    ProtoConversionError,
    ProtocolError,
    SequenceNumberMismatchError,
    ServerError,
    SignatureConversionError,
    TransportError,
    UnexpectedEndOfStreamError,
    UnexpectedObjectError,
    UnexpectedResultCountError,
    UnexpectedTransactionError,
    UnknownPayloadError,
    UnknownVariantError,
} from '../../src/errors.js';

// Every message below is copied from the #[error("...")] attributes in
// api/common.rs of iota-sdk-grpc-client. Searching either repo for one of
// these strings has to find the same thing.
const MESSAGES: Array<[string, IotaGrpcError]> = [
    ['server error (code 5): not found', new ServerError(5, 'not found')],
    ['proto conversion error: bad digest', new ProtoConversionError('bad digest')],
    ['signature conversion error: bad sig', new SignatureConversionError('bad sig')],
    ['empty request: at least one item must be provided', new EmptyRequestError()],
    [
        'stream ended unexpectedly: server indicated more results with has_next=true',
        new UnexpectedEndOfStreamError(),
    ],
    ['grpc error: unavailable', new TransportError('unavailable')],
    ['protocol error: expected 10 results, got 7', new UnexpectedResultCountError(10, 7)],
    [
        'protocol error: requested object 0xaa at position 2, but got 0xbb',
        new UnexpectedObjectError(2, '0xaa', '0xbb'),
    ],
    [
        'protocol error: requested transaction 0xaa at position 2, but got 0xbb',
        new UnexpectedTransactionError(2, '0xaa', '0xbb'),
    ],
    ['protocol error: unknown payload variant', new UnknownVariantError('payload')],
    ['protocol error: empty response field: digest', new EmptyResponseFieldError('digest')],
    [
        'protocol error: checkpoint stream error: received events before checkpoint header',
        new DataBeforeHeaderError('events'),
    ],
    [
        'protocol error: checkpoint stream error: new checkpoint header before previous completed',
        new IncompleteCheckpointError(),
    ],
    [
        'protocol error: checkpoint stream error: end marker sequence number 5 does not match checkpoint 4',
        new SequenceNumberMismatchError(4n, 5n),
    ],
    [
        'protocol error: checkpoint stream error: unknown checkpoint data payload type',
        new UnknownPayloadError(),
    ],
    [
        'protocol error: checkpoint stream error: stream ended with incomplete data for checkpoint 42',
        new IncompleteStreamError(42n),
    ],
];

describe('error messages', () => {
    it.each(MESSAGES)('%s', (message, error) => {
        expect(error.message).toBe(message);
    });
});

describe('error hierarchy', () => {
    it('catches the checkpoint family as one', () => {
        const error = new SequenceNumberMismatchError(4n, 5n);

        expect(error).toBeInstanceOf(SequenceNumberMismatchError);
        expect(error).toBeInstanceOf(CheckpointStreamError);
        expect(error).toBeInstanceOf(ProtocolError);
        expect(error).toBeInstanceOf(IotaGrpcError);
        expect(error).toBeInstanceOf(Error);
    });

    it('keeps other protocol errors out of the checkpoint family', () => {
        const error = new UnexpectedResultCountError(10, 7);

        expect(error).toBeInstanceOf(ProtocolError);
        expect(error).not.toBeInstanceOf(CheckpointStreamError);
    });
});

describe('error data', () => {
    it('keeps the values it was built with', () => {
        const error = new UnexpectedObjectError(2, '0xaa', '0xbb');

        expect(error.position).toBe(2);
        expect(error.expected).toBe('0xaa');
        expect(error.actual).toBe('0xbb');
    });

    it('keeps the server code', () => {
        expect(new ServerError(5, 'not found').code).toBe(5);
    });
});
