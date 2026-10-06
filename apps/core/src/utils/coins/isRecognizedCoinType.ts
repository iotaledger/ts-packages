// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { normalizeIotaObjectId, parseStructTag } from '@iota/iota-sdk/utils';

export function isRecognizedCoinType(coinType: string, recognizedPackages: string[]): boolean {
    const { address } = parseStructTag(coinType);
    return recognizedPackages.some((packageId) => normalizeIotaObjectId(packageId) === address);
}
