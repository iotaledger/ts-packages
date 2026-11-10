// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export class GasStationError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'GasStationError';
        this.status = status;
    }
}
