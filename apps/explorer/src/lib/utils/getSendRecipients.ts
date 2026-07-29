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

function getCoinRecipients(transaction: IotaTransactionBlockResponse): string[] {
    return (transaction.balanceChanges ?? [])
        .filter((change) => BigInt(change.amount) > 0n)
        .map((change) => getAddressOwner(change.owner))
        .filter((address): address is string => !!address);
}

function getObjectRecipients(
    transaction: IotaTransactionBlockResponse,
    sender?: string,
    includeMutatedObjects = false,
): string[] {
    return (transaction.objectChanges ?? [])
        .map((change) => {
            if (!('objectType' in change) || change.objectType.startsWith('0x2::coin::Coin')) {
                return undefined;
            }
            if (change.type === 'transferred') {
                return getAddressOwner(change.recipient);
            }
            if (
                change.type === 'created' ||
                change.type === 'unwrapped' ||
                (includeMutatedObjects && change.type === 'mutated')
            ) {
                const owner = getAddressOwner(change.owner);
                return owner && owner !== sender ? owner : undefined;
            }
            return undefined;
        })
        .filter((recipient): recipient is string => !!recipient);
}

/**
 * Addresses that received a coin or a newly-owned non-coin object in this transaction.
 * A mutation alone is deliberately excluded: retaining ownership of an object that was changed
 * is not evidence that the address received anything.
 */
export function getTransactionRecipients(
    transaction: IotaTransactionBlockResponse,
    sender?: string,
): Set<string> {
    return new Set([
        ...getCoinRecipients(transaction),
        ...getObjectRecipients(transaction, sender),
    ]);
}

export function getSendRecipients(
    transaction: IotaTransactionBlockResponse,
    sender?: string,
): SendRecipients {
    const sentObjectRecipients = getObjectRecipients(transaction, sender, true);

    const addresses = new Set(
        [
            ...getCoinRecipients(transaction).filter((address) => address !== sender),
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
