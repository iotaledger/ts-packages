// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { CoinOwnerType, CoinTrust } from '../enums/coins.enums';
import { CoinValuation } from '../types/coins';

export interface CoinRegistryEntry {
    coinType: string;
    name?: string;
    trust: CoinTrust;
    valuation?: CoinValuation;
}

export interface CoinAmountChange {
    coinType: string;
    amount: bigint;
}

export interface CoinOwnerChanges {
    owner: string;
    ownerType: CoinOwnerType;
    changes: CoinAmountChange[];
}

export interface GasCostDetails {
    payer: string;
    amount: bigint;
    isSponsored: boolean;
}

export interface TransactionCoinBalances {
    sender?: string;
    owners: CoinOwnerChanges[];
    gas: GasCostDetails | null;
}
