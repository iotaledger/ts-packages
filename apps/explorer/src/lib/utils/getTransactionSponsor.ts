// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { normalizeIotaAddress } from '@iota/iota-sdk/utils';

export function getTransactionSponsor(
    transaction: IotaTransactionBlockResponse,
): string | undefined {
    const sender = transaction.transaction?.data.sender;
    const gasOwner = transaction.transaction?.data.gasData.owner;

    if (!sender || !gasOwner || normalizeIotaAddress(sender) === normalizeIotaAddress(gasOwner)) {
        return undefined;
    }

    return gasOwner;
}
