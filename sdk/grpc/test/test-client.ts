// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { IotaGrpcClient } from '../src/index.js';

/** `ledger` is protected so callers cannot skip reassembly. Tests widen it back. */
export class IotaGrpcTestClient extends IotaGrpcClient {
    override get ledger() {
        return super.ledger;
    }
}
