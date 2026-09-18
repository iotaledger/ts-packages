// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type CoinBalance } from '@iota/iota-sdk/client';
import { MILLISECONDS_PER_SECOND } from '@iota/core';

export interface AddressFromFinder {
    publicKey: string;
    bipPath: Bip44Path;
    hasTimelockedObjects: boolean;
    hasStardustObjects: boolean;
    hasAssets: boolean;
    balance: CoinBalance;
}

export interface Bip44Path {
    accountIndex: number;
    addressIndex: number;
    changeIndex: number;
}

export interface AccountFromFinder {
    index: number;
    /**
     * - Example structure of 'addresses':
     *    [
     *       [change0, change1], // 'change0' and 'change1' are addresses for the account at index 0
     *       [change0, change1], // 'change0' and 'change1' are addresses for the account at index 1
     *       ...
     *    ]
     */
    addresses: Array<Array<AddressFromFinder>>;
}

export class AccountTooManyAttemptsError extends Error {
    constructor() {
        super('too-many-attempts');
    }

    static is(error: Error) {
        return error.message === 'too-many-attempts';
    }
}

export function getTooManyAttemptsMessage(remainingTimeMs: number) {
    const remainingSeconds = Math.ceil(remainingTimeMs / MILLISECONDS_PER_SECOND);
    return `Too many failed attempts. Please try again in ${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}.`;
}

export function getIncorrectPasswordMessage(
    remainingAttempts: number,
    reason = 'Incorrect password',
) {
    return `${reason}. You have ${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} left.`;
}
