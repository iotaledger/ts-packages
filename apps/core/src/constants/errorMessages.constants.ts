// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export const GAS_BALANCE_TOO_LOW_ID = 'GasBalanceTooLow';
export const NOT_ENOUGH_BALANCE_ID = 'No valid gas coins found';
export const INSUFFICIENT_BALANCE_ID = 'Insufficient balance:';
export const TOO_MANY_GAS_COINS_ID = 'Not enough balance in gas coins';

export const GAS_BUDGET_ERROR_MESSAGES = {
    [GAS_BALANCE_TOO_LOW_ID]: 'Not enough balance to cover transaction fees.',
    [NOT_ENOUGH_BALANCE_ID]: 'Not enough balance to create the transaction.',
    [INSUFFICIENT_BALANCE_ID]: 'Not enough balance to create the transaction.',
    [TOO_MANY_GAS_COINS_ID]:
        'Your balance is split into too many coins to use it all at once. Merge your coins and try again.',
};

export const NO_BALANCE_GENERIC_MESSAGE = 'Make sure you have enough funds and try again.';
