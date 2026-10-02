// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { HandlerContext, ServiceImpl } from '@connectrpc/connect';
import { Code, ConnectError, createRouterTransport } from '@connectrpc/connect';
import { toBase58 } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import {
    DEFAULT_READ_MASKS,
    EpochField,
    IotaGrpcClient,
    normalizeReadMask,
    ProtoConversionError,
    ServiceInfoField,
    TransportError,
} from '../../src/index.js';
import type {
    GetEpochRequest,
    GetHealthRequest,
    GetServiceInfoRequest,
} from '../../src/proto/iota/grpc/v1/ledger_service_pb.js';
import { LedgerService } from '../../src/proto/iota/grpc/v1/ledger_service_pb.js';

const CHAIN_ID = toBase58(new Uint8Array(32).fill(1));

function sendMetadata(context: HandlerContext) {
    context.responseHeader.set('x-iota-chain-id', CHAIN_ID);
    context.responseHeader.set('x-iota-chain', 'testnet');
    context.responseHeader.set('x-iota-epoch', '42');
    context.responseHeader.set('x-iota-checkpoint-height', '1000');
}

const METADATA = {
    chainId: CHAIN_ID,
    chain: 'testnet',
    epoch: 42n,
    checkpointHeight: 1000n,
};

function clientFor(ledger: Partial<ServiceImpl<typeof LedgerService>>) {
    return new IotaGrpcClient({
        transport: createRouterTransport(({ service }) => service(LedgerService, ledger)),
    });
}

describe('getHealth', () => {
    it('returns the body with the response metadata', async () => {
        const client = clientFor({
            getHealth(_request, context) {
                sendMetadata(context);
                return { executedCheckpointHeight: 1000n };
            },
        });

        const { body, metadata } = await client.getHealth();

        expect(body.executedCheckpointHeight).toBe(1000n);
        expect(metadata).toMatchObject(METADATA);
    });

    it('leaves the threshold to the server unless given one', async () => {
        const requests: GetHealthRequest[] = [];
        const client = clientFor({
            getHealth(request) {
                requests.push(request);
                return {};
            },
        });

        await client.getHealth();
        await client.getHealth({ thresholdMs: 30_000n });

        expect(requests.map((request) => request.thresholdMs)).toEqual([undefined, 30_000n]);
    });

    it('reports a stale node as UNAVAILABLE', async () => {
        const client = clientFor({
            getHealth() {
                throw new ConnectError('latest checkpoint is too old', Code.Unavailable);
            },
        });

        const error = await client.getHealth().catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({
            code: Code.Unavailable,
            detail: 'latest checkpoint is too old',
        });
    });
});

describe('getServiceInfo', () => {
    it('returns the body with the response metadata', async () => {
        const client = clientFor({
            getServiceInfo(_request, context) {
                sendMetadata(context);
                return { chain: 'testnet', epoch: 42n };
            },
        });

        const { body, metadata } = await client.getServiceInfo();

        expect(body).toMatchObject({ chain: 'testnet', epoch: 42n });
        expect(metadata).toMatchObject(METADATA);
    });

    it('sends the default read mask unless given one', async () => {
        const requests: GetServiceInfoRequest[] = [];
        const client = clientFor({
            getServiceInfo(request) {
                requests.push(request);
                return {};
            },
        });

        await client.getServiceInfo();
        await client.getServiceInfo({ readMask: ServiceInfoField.CHAIN_ID });
        await client.getServiceInfo({
            readMask: [ServiceInfoField.SERVER, ServiceInfoField.EPOCH],
        });

        expect(requests.map((request) => request.readMask?.paths)).toEqual([
            normalizeReadMask(DEFAULT_READ_MASKS.getServiceInfo),
            ['chain_id'],
            ['epoch', 'server'],
        ]);
    });
});

describe('getEpoch', () => {
    it('unwraps the epoch from the response', async () => {
        const client = clientFor({
            getEpoch(_request, context) {
                sendMetadata(context);
                return { epoch: { epoch: 42n, referenceGasPrice: 1000n } };
            },
        });

        const { body, metadata } = await client.getEpoch();

        expect(body).toMatchObject({ epoch: 42n, referenceGasPrice: 1000n });
        expect(metadata).toMatchObject(METADATA);
    });

    it('asks for the current epoch unless given one, including epoch 0', async () => {
        const requests: GetEpochRequest[] = [];
        const client = clientFor({
            getEpoch(request) {
                requests.push(request);
                return { epoch: {} };
            },
        });

        await client.getEpoch();
        await client.getEpoch({ epoch: 0n });
        await client.getEpoch({ epoch: 7n });

        expect(requests.map((request) => request.epoch)).toEqual([undefined, 0n, 7n]);
    });

    it('sends the default read mask unless given one', async () => {
        const requests: GetEpochRequest[] = [];
        const client = clientFor({
            getEpoch(request) {
                requests.push(request);
                return { epoch: {} };
            },
        });

        await client.getEpoch();
        await client.getEpoch({ readMask: [EpochField.EPOCH, EpochField.FIRST_CHECKPOINT] });

        expect(requests.map((request) => request.readMask?.paths)).toEqual([
            normalizeReadMask(DEFAULT_READ_MASKS.getEpoch),
            ['epoch', 'first_checkpoint'],
        ]);
    });

    it('rejects a response without an epoch', async () => {
        const client = clientFor({ getEpoch: () => ({}) });

        await expect(client.getEpoch()).rejects.toThrow(
            new ProtoConversionError("missing field 'epoch'"),
        );
    });
});

describe('getReferenceGasPrice', () => {
    it('asks for the reference gas price only and returns it', async () => {
        const requests: GetEpochRequest[] = [];
        const client = clientFor({
            getEpoch(request, context) {
                requests.push(request);
                sendMetadata(context);
                return { epoch: { referenceGasPrice: 1000n } };
            },
        });

        const { body, metadata } = await client.getReferenceGasPrice();

        expect(body).toBe(1000n);
        expect(metadata).toMatchObject(METADATA);
        expect(requests[0].epoch).toBeUndefined();
        expect(requests[0].readMask?.paths).toEqual(['reference_gas_price']);
    });

    it('rejects a response without a reference gas price', async () => {
        const client = clientFor({ getEpoch: () => ({ epoch: { epoch: 42n } }) });

        await expect(client.getReferenceGasPrice()).rejects.toThrow(
            new ProtoConversionError("missing field 'reference_gas_price'"),
        );
    });
});

describe('call errors', () => {
    it('maps an aborted call to CANCELED', async () => {
        const client = clientFor({ getServiceInfo: () => ({}) });

        const error = await client
            .getServiceInfo({ signal: AbortSignal.abort() })
            .catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Canceled });
    });

    it('maps an RPC the node does not serve to UNIMPLEMENTED', async () => {
        const client = clientFor({});

        const error = await client.getServiceInfo().catch((error: unknown) => error);

        expect(error).toBeInstanceOf(TransportError);
        expect(error).toMatchObject({ code: Code.Unimplemented });
    });
});
