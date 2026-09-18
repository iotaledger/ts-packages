// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { createClient } from '@connectrpc/connect';
import type { Transport } from '@connectrpc/connect';
import { createGrpcTransport } from '@connectrpc/connect-node';

import { LedgerService } from './generated/iota/grpc/v1/ledger_service_pb.js';

export function createNodeTransport(options: { baseUrl: string }): Transport {
    return createGrpcTransport({ baseUrl: options.baseUrl });
}

export function createIotaGrpcClient(transport: Transport) {
    return {
        ledger: createClient(LedgerService, transport),
    };
}
