// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { IotaGrpcClient } from '../src/index.js';

/** The raw service clients are protected so callers cannot skip reassembly. Tests widen them back. */
export class IotaGrpcTestClient extends IotaGrpcClient {
    override get ledger() {
        return super.ledger;
    }

    override get state() {
        return super.state;
    }

    override get movePackage() {
        return super.movePackage;
    }

    override get execution() {
        return super.execution;
    }
}
