// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaTransactionBlockResponse, ObjectOwner } from '@iota/iota-sdk/client';

export function getAddressOwner(owner?: ObjectOwner | null): string | undefined {
    return owner && typeof owner === 'object' && 'AddressOwner' in owner
        ? owner.AddressOwner
        : undefined;
}

export interface SendRecipients {
    addresses: Set<string>;
    sentObjectCount: number;
}

export function getSendRecipients(
    transaction: IotaTransactionBlockResponse,
    sender?: string,
): SendRecipients {
    const received = (transaction.balanceChanges ?? []).filter((change) => {
        const owner = getAddressOwner(change.owner);
        return BigInt(change.amount) > 0n && owner && owner !== sender;
    });

    const sentObjectRecipients = (transaction.objectChanges ?? [])
        .map((change) => {
            if (!('objectType' in change) || change.objectType.startsWith('0x2::coin::Coin')) {
                return undefined;
            }
            if (change.type === 'transferred') {
                return getAddressOwner(change.recipient);
            }
            if (change.type === 'mutated' || change.type === 'created') {
                const owner = getAddressOwner(change.owner);
                return owner && owner !== sender ? owner : undefined;
            }
            return undefined;
        })
        .filter((recipient): recipient is string => !!recipient);

    const addresses = new Set(
        [
            ...received.map((change) => getAddressOwner(change.owner)),
            ...sentObjectRecipients,
        ].filter((address): address is string => !!address),
    );

    return { addresses, sentObjectCount: sentObjectRecipients.length };
}

export function getSendRecipientAddress(
    transaction: IotaTransactionBlockResponse,
    sender?: string,
): string | undefined {
    const { addresses } = getSendRecipients(transaction, sender);
    return addresses.size === 1 ? [...addresses][0] : undefined;
}
