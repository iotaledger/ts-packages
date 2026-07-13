// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

// Shared grid column layout for the coins table header and rows: Name, Price
// (hidden on small screens, and dropped entirely when no price data is
// available), Amount, Objects.
//
// The Objects track is wide enough to fit the "Objects" header label without
// wrapping/overflowing, while still comfortably fitting the count + chevron
// row content left-aligned within the same track.
export function getCoinRowGridClasses(showPrice: boolean): string {
    return showPrice
        ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,110px)_64px] items-start gap-x-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,90px)_minmax(0,140px)_64px]'
        : 'grid grid-cols-[minmax(0,1fr)_minmax(0,110px)_64px] items-start gap-x-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,140px)_64px]';
}

// Shared per-column text/content alignment so the header and row cells for a
// given grid track can never drift apart. Every column is left-aligned so the
// header label starts at the same x as its column's cell content.
export const COIN_TABLE_COLUMN_ALIGNMENT = {
    price: 'text-left',
    objects: 'justify-start text-left',
} as const;
