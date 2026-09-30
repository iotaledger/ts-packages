// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { Client } from '@connectrpc/connect';
import { createClient } from '@connectrpc/connect';

import { IotaGrpcClient } from '../src/index.js';
import { StateService } from '../src/proto/iota/grpc/v1/state_service_pb.js';

/** `ledger` is protected so callers cannot skip reassembly. Tests widen it back. */
export class IotaGrpcTestClient extends IotaGrpcClient {
    private stateClient: Client<typeof StateService> | undefined;

    override get ledger() {
        return super.ledger;
    }

    /** The client has no StateService handle yet, so tests build one on the same transport. */
    get state(): Client<typeof StateService> {
        this.stateClient ??= createClient(StateService, this.transport);
        return this.stateClient;
    }
}
