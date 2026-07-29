// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaClient, type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { describe, expect, it } from 'vitest';

import {
    matchesTransactionDirection,
    MAX_RAW_PAGES_PER_REQUEST,
    queryAddressTransactionsPage,
    RAW_PAGE_SIZE,
    TransactionDirection,
} from '../addressTransactionFilters';

const ADDRESS = '0x1';
const OTHER_ADDRESS = '0x2';

function transaction(
    sender: string,
    options: Pick<IotaTransactionBlockResponse, 'balanceChanges' | 'objectChanges'> = {},
    digest = 'digest',
): IotaTransactionBlockResponse {
    return {
        digest,
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

function createHistoryClient(history: IotaTransactionBlockResponse[]) {
    const requests: { cursor: string | null; limit: number }[] = [];
    const client = {
        queryTransactionBlocks: async ({
            cursor,
            limit,
        }: {
            cursor?: string | null;
            limit?: number;
        }) => {
            requests.push({ cursor: cursor ?? null, limit: limit ?? 0 });
            const start = cursor ? Number(cursor) : 0;
            const end = Math.min(start + (limit ?? history.length), history.length);
            const hasNextPage = end < history.length;
            return {
                data: history.slice(start, end),
                nextCursor: hasNextPage ? String(end) : null,
                hasNextPage,
            };
        },
    } as unknown as Pick<IotaClient, 'queryTransactionBlocks'>;
    return { client, requests };
}

const INITIAL_PAGE_PARAM = { cursor: null, buffered: [], rawHistoryExhausted: false };

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

describe('queryAddressTransactionsPage', () => {
    it('buffers overflow matches and serves the next page from them without refetching', async () => {
        const history = Array.from({ length: RAW_PAGE_SIZE * 2 }, (_, index) =>
            transaction(index % 2 === 0 ? ADDRESS : OTHER_ADDRESS, {}, `tx-${index}`),
        );
        const { client, requests } = createHistoryClient(history);
        const limit = 3;

        const firstPage = await queryAddressTransactionsPage(
            client,
            ADDRESS,
            TransactionDirection.Sent,
            INITIAL_PAGE_PARAM,
            limit,
        );

        expect(firstPage.data.map((txn) => txn.digest)).toEqual(['tx-0', 'tx-2', 'tx-4']);
        expect(firstPage.hasNextPage).toBe(true);
        expect(requests).toHaveLength(1);
        expect(requests[0].limit).toBe(RAW_PAGE_SIZE);

        const secondPage = await queryAddressTransactionsPage(
            client,
            ADDRESS,
            TransactionDirection.Sent,
            firstPage.nextPageParam!,
            limit,
        );

        expect(secondPage.data.map((txn) => txn.digest)).toEqual(['tx-6', 'tx-8', 'tx-10']);
        expect(requests).toHaveLength(1);
    });

    it('stops scanning at the request budget and resumes on the next page request', async () => {
        const historyLength = RAW_PAGE_SIZE * (MAX_RAW_PAGES_PER_REQUEST + 2);
        const history = Array.from({ length: historyLength }, (_, index) =>
            transaction(OTHER_ADDRESS, {}, `tx-${index}`),
        );
        const { client, requests } = createHistoryClient(history);

        const firstPage = await queryAddressTransactionsPage(
            client,
            ADDRESS,
            TransactionDirection.Sent,
            INITIAL_PAGE_PARAM,
            10,
        );

        expect(requests).toHaveLength(MAX_RAW_PAGES_PER_REQUEST);
        expect(firstPage.data).toEqual([]);
        expect(firstPage.hasNextPage).toBe(true);
        expect(firstPage.nextPageParam?.cursor).toBe(
            String(RAW_PAGE_SIZE * MAX_RAW_PAGES_PER_REQUEST),
        );

        const secondPage = await queryAddressTransactionsPage(
            client,
            ADDRESS,
            TransactionDirection.Sent,
            firstPage.nextPageParam!,
            10,
        );

        expect(requests).toHaveLength(MAX_RAW_PAGES_PER_REQUEST + 2);
        expect(secondPage.data).toEqual([]);
        expect(secondPage.hasNextPage).toBe(false);
        expect(secondPage.nextPageParam).toBeNull();
    });

    it('reports no next page once the history is exhausted with the matches it found', async () => {
        const history = [
            transaction(ADDRESS, {}, 'tx-0'),
            transaction(OTHER_ADDRESS, {}, 'tx-1'),
            transaction(ADDRESS, {}, 'tx-2'),
        ];
        const { client } = createHistoryClient(history);

        const page = await queryAddressTransactionsPage(
            client,
            ADDRESS,
            TransactionDirection.Sent,
            INITIAL_PAGE_PARAM,
            10,
        );

        expect(page.data.map((txn) => txn.digest)).toEqual(['tx-0', 'tx-2']);
        expect(page.hasNextPage).toBe(false);
        expect(page.nextPageParam).toBeNull();
    });
});
