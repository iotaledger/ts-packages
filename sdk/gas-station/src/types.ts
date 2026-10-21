// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { HttpHeaders, TransactionEffects } from '@iota/iota-sdk/client';
import type { ObjectRef } from '@iota/iota-sdk/transactions';

export interface GasStationClientOptions {
    url: string;
    authToken?: string;
    headers?: HttpHeaders;
    fetch?: typeof fetch;
}

export interface GasStationRequestOptions {
    headers?: HttpHeaders;
    signal?: AbortSignal;
}

export interface ReserveGasParams extends GasStationRequestOptions {
    gasBudget: number;
    reserveDurationSecs: number;
}

export interface ReserveGasResult {
    sponsorAddress: string;
    reservationId: number;
    gasCoins: ObjectRef[];
}

export type ExecuteTransactionRequestType = 'waitForEffectsCert' | 'waitForLocalExecution';

export interface ExecuteTransactionParams extends GasStationRequestOptions {
    reservationId: number;
    transaction: Uint8Array | string;
    signature: string;
    requestType?: ExecuteTransactionRequestType;
}

export interface ReserveGasResponse {
    result: {
        sponsor_address: string;
        reservation_id: number;
        gas_coins: ObjectRef[];
    };
    error?: string | null;
}

export interface ExecuteTransactionResponse {
    effects: TransactionEffects;
    error?: string | null;
}
