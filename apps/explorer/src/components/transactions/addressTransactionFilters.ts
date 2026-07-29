// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaClient, type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';

export enum TransactionDirection {
    All = 'all',
    Received = 'received',
    Sent = 'sent',
}

interface PaginatedAddressTransactions {
    data: IotaTransactionBlockResponse[];
    nextPageParam: AddressTransactionPageParam | null;
    hasNextPage: boolean;
}

export interface AddressTransactionPageParam {
    cursor: string | null;
    buffered: IotaTransactionBlockResponse[];
}

const TRANSACTION_QUERY_OPTIONS = {
    showEffects: true,
    showInput: true,
    showBalanceChanges: true,
    showEvents: true,
};

export function matchesTransactionDirection(
    txn: IotaTransactionBlockResponse,
    direction: TransactionDirection,
    address: string,
): boolean {
    if (direction === TransactionDirection.All) {
        return true;
    }

    // `FromOrToAddress` returns every transaction which affected this address. Direction is
    // determined by who submitted it, not by its net IOTA balance change: a programmable
    // transaction can receive IOTA or only pay gas while still being sent by this address.
    const isReceived = txn.transaction?.data.sender !== address;

    return direction === TransactionDirection.Received ? isReceived : !isReceived;
}

function fetchAddressTransactionPage(
    client: Pick<IotaClient, 'queryTransactionBlocks'>,
    address: string,
    cursor: string | null,
    limit: number,
) {
    return client.queryTransactionBlocks({
        filter: { FromOrToAddress: { addr: address } },
        order: 'descending',
        options: TRANSACTION_QUERY_OPTIONS,
        cursor,
        limit,
    });
}

/**
 * Builds a full page for one direction from the only full-history address query supported by the
 * indexer. A raw page can contain no rows for the selected direction, so keep advancing its
 * cursor until this page is full or the address history is exhausted.
 */
export async function queryAddressTransactionsPage(
    client: Pick<IotaClient, 'queryTransactionBlocks'>,
    address: string,
    direction: TransactionDirection,
    pageParam: AddressTransactionPageParam,
    limit: number,
): Promise<PaginatedAddressTransactions> {
    const data = [...pageParam.buffered];
    let nextCursor = pageParam.cursor;
    let hasNextPage = true;

    while (data.length < limit && hasNextPage) {
        const page = await fetchAddressTransactionPage(
            client,
            address,
            nextCursor,
            // Never consume more raw rows than this filtered page can hold. Otherwise matching
            // rows beyond the requested page size would be skipped when the raw cursor advances.
            limit - data.length,
        );

        data.push(
            ...page.data.filter((transaction) =>
                matchesTransactionDirection(transaction, direction, address),
            ),
        );

        nextCursor = page.nextCursor ?? null;
        hasNextPage = page.hasNextPage && nextCursor !== null;
    }

    if (!hasNextPage) {
        return { data, nextPageParam: null, hasNextPage: false };
    }

    if (direction === TransactionDirection.All) {
        return {
            data,
            nextPageParam: { cursor: nextCursor, buffered: [] },
            hasNextPage: true,
        };
    }

    // A raw next page does not necessarily contain a matching row. Probe until the next match is
    // found, then carry it into the next filtered page so the UI never advances to an empty page.
    while (hasNextPage) {
        const page = await fetchAddressTransactionPage(client, address, nextCursor, 1);

        nextCursor = page.nextCursor ?? null;
        hasNextPage = page.hasNextPage && nextCursor !== null;
        const nextMatch = page.data.find((transaction) =>
            matchesTransactionDirection(transaction, direction, address),
        );

        if (nextMatch) {
            return {
                data,
                nextPageParam: { cursor: nextCursor, buffered: [nextMatch] },
                hasNextPage: true,
            };
        }
    }

    return { data, nextPageParam: null, hasNextPage: false };
}
