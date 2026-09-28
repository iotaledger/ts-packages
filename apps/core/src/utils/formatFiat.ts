// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export type FiatCurrency = 'USD';

export function formatFiat(value: number, currency: FiatCurrency = 'USD'): string {
    return value.toLocaleString('en', { style: 'currency', currency });
}
