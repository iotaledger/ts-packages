// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { Client } from '@connectrpc/connect';

import { IotaGrpcClient } from '../src/index.js';
import type { LedgerService } from '../src/proto/iota/grpc/v1/ledger_service_pb.js';
import type { MovePackageService } from '../src/proto/iota/grpc/v1/move_package_service_pb.js';
import type { StateService } from '../src/proto/iota/grpc/v1/state_service_pb.js';
import type { TransactionExecutionService } from '../src/proto/iota/grpc/v1/transaction_execution_service_pb.js';

/** The raw service clients are protected so callers cannot skip reassembly. Tests widen them back. */
export class IotaGrpcTestClient extends IotaGrpcClient {
    override get ledger(): Client<typeof LedgerService> {
        return super.ledger;
    }

    override get state(): Client<typeof StateService> {
        return super.state;
    }

    override get movePackage(): Client<typeof MovePackageService> {
        return super.movePackage;
    }

    override get execution(): Client<typeof TransactionExecutionService> {
        return super.execution;
    }
}
