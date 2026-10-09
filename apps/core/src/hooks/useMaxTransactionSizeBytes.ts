// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useTransactionLimits } from './useTransactionLimits';

export const SIZE_LIMIT_EXCEEDED = 'SizeLimitExceeded';

export function useMaxTransactionSizeBytes() {
    return useTransactionLimits(({ maxTxSizeBytes }) => maxTxSizeBytes);
}
