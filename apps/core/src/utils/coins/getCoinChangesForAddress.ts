// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { CoinAmountChange, TransactionCoinBalances } from '../../interfaces';

export function getCoinChangesForAddress(
    balances: TransactionCoinBalances | null,
    address: string,
): CoinAmountChange[] {
    const normalizedAddress = normalizeIotaAddress(address);
    return (
        balances?.owners.find(({ owner }) => normalizeIotaAddress(owner) === normalizedAddress)
            ?.changes ?? []
    );
}
