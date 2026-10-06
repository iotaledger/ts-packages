// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export function getSameNameWarningTitle(recognizedCoinName: string): string {
    return `This coin is not the recognized ${recognizedCoinName}`;
}

export const SAME_NAME_WARNING_TEXT =
    "It has the same name or symbol, but it's a different coin. Check the coin type before using it.";
