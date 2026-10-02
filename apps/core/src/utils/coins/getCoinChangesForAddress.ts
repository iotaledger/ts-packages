// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { IOTA_TYPE_ARG, normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { CoinAmountChange, TransactionCoinBalances } from '../../interfaces';

export function getCoinChangesForAddress(
    balances: TransactionCoinBalances | null,
    address: string,
): CoinAmountChange[] {
    const normalizedAddress = normalizeIotaAddress(address);
    const changes =
        balances?.owners.find(({ owner }) => normalizeIotaAddress(owner) === normalizedAddress)
            ?.changes ?? [];

    const gas = balances?.gas;
    if (
        !changes.length &&
        gas &&
        gas.amount !== 0n &&
        normalizeIotaAddress(gas.payer) === normalizedAddress
    ) {
        return [{ coinType: IOTA_TYPE_ARG, amount: -gas.amount }];
    }

    return changes;
}
