// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { describe, expect, it } from 'vitest';

import { matchesTransactionDirection, TransactionDirection } from '../addressTransactionFilters';

const ADDRESS = '0x1';
const OTHER_ADDRESS = '0x2';

function transaction(
    sender: string,
    options: Pick<IotaTransactionBlockResponse, 'balanceChanges' | 'objectChanges'> = {},
): IotaTransactionBlockResponse {
    return {
        digest: 'digest',
        transaction: {
            data: {
                sender,
                transaction: {
                    kind: 'ProgrammableTransaction',
                    transactions: [],
                    inputs: [],
                },
            },
        },
        ...options,
    } as unknown as IotaTransactionBlockResponse;
}

function addressOwnedCoinChange(amount: string) {
    return {
        coinType: '0x2::iota::IOTA',
        owner: { AddressOwner: ADDRESS },
        amount,
    };
}

function transferredObject(recipient: string) {
    return {
        type: 'transferred' as const,
        digest: 'object-digest',
        objectId: '0x3',
        objectType: '0x42::nft::Nft',
        recipient: { AddressOwner: recipient },
        sender: OTHER_ADDRESS,
        version: '1',
    };
}

function mutatedObject(owner: string) {
    return {
        type: 'mutated' as const,
        digest: 'object-digest',
        objectId: '0x3',
        objectType: '0x42::nft::Nft',
        owner: { AddressOwner: owner },
        previousVersion: '1',
        sender: OTHER_ADDRESS,
        version: '2',
    };
}

describe('address transaction filters', () => {
    it('keeps a transaction submitted by the address in Sent when it also receives IOTA', () => {
        const unstake = transaction(ADDRESS, {
            balanceChanges: [addressOwnedCoinChange('1000000')],
        });

        expect(matchesTransactionDirection(unstake, TransactionDirection.Sent, ADDRESS)).toBe(true);
        expect(matchesTransactionDirection(unstake, TransactionDirection.Received, ADDRESS)).toBe(
            true,
        );
    });

    it('classifies coin and transferred-object recipients as received', () => {
        const coinReceipt = transaction(OTHER_ADDRESS, {
            balanceChanges: [addressOwnedCoinChange('100')],
        });
        const objectReceipt = transaction(OTHER_ADDRESS, {
            objectChanges: [transferredObject(ADDRESS)],
        });

        expect(
            matchesTransactionDirection(coinReceipt, TransactionDirection.Received, ADDRESS),
        ).toBe(true);
        expect(
            matchesTransactionDirection(objectReceipt, TransactionDirection.Received, ADDRESS),
        ).toBe(true);
    });

    it('shows self-transfers in both directions', () => {
        const selfTransfer = transaction(ADDRESS, {
            objectChanges: [transferredObject(ADDRESS)],
        });

        expect(matchesTransactionDirection(selfTransfer, TransactionDirection.Sent, ADDRESS)).toBe(
            true,
        );
        expect(
            matchesTransactionDirection(selfTransfer, TransactionDirection.Received, ADDRESS),
        ).toBe(true);
    });

    it('does not treat gas payment or mutation of an existing object as receipt', () => {
        const sponsoredTransaction = transaction(OTHER_ADDRESS, {
            balanceChanges: [addressOwnedCoinChange('-100')],
        });
        const mutation = transaction(OTHER_ADDRESS, {
            objectChanges: [mutatedObject(ADDRESS)],
        });

        expect(
            matchesTransactionDirection(
                sponsoredTransaction,
                TransactionDirection.Received,
                ADDRESS,
            ),
        ).toBe(false);
        expect(matchesTransactionDirection(mutation, TransactionDirection.Received, ADDRESS)).toBe(
            false,
        );
    });
});
