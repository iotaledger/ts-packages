// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaClient, type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { getTransactionRecipients } from '~/lib/utils';

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
    rawHistoryExhausted: boolean;
}

export const RAW_PAGE_SIZE = 50;
export const MAX_RAW_PAGES_PER_REQUEST = 10;

const TRANSACTION_QUERY_OPTIONS = {
    showEffects: true,
    showInput: true,
    showBalanceChanges: true,
    showEvents: true,
    showObjectChanges: true,
};

export function matchesTransactionDirection(
    txn: IotaTransactionBlockResponse,
    direction: TransactionDirection,
    address: string,
): boolean {
    if (direction === TransactionDirection.All) {
        return true;
    }

    const sender = txn.transaction?.data.sender;
    const isSent = sender === address;
    const isReceived = getTransactionRecipients(txn, sender).has(address);

    return direction === TransactionDirection.Received ? isReceived : isSent;
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
 * indexer. A raw page can contain no rows for the selected direction, so the raw cursor advances
 * in fixed-size chunks until this page holds `limit` matches plus one extra proving a next page
 * exists, the history is exhausted, or the per-request budget of `MAX_RAW_PAGES_PER_REQUEST`
 * RPC calls is spent. Matches beyond `limit` are carried in `buffered` so advancing the raw
 * cursor never skips or duplicates a row.
 *
 * When the budget runs out before a next match is proven, the page is returned as-is (possibly
 * short or empty) with `hasNextPage: true`; requesting the next page resumes the scan with a
 * fresh budget, keeping the per-interaction node load bounded.
 */
export async function queryAddressTransactionsPage(
    client: Pick<IotaClient, 'queryTransactionBlocks'>,
    address: string,
    direction: TransactionDirection,
    pageParam: AddressTransactionPageParam,
    limit: number,
): Promise<PaginatedAddressTransactions> {
    const matches = [...pageParam.buffered];
    let nextCursor = pageParam.cursor;
    let rawHistoryExhausted = pageParam.rawHistoryExhausted;
    let rawPagesFetched = 0;

    while (
        matches.length <= limit &&
        !rawHistoryExhausted &&
        rawPagesFetched < MAX_RAW_PAGES_PER_REQUEST
    ) {
        const page = await fetchAddressTransactionPage(client, address, nextCursor, RAW_PAGE_SIZE);
        rawPagesFetched += 1;

        matches.push(
            ...page.data.filter((transaction) =>
                matchesTransactionDirection(transaction, direction, address),
            ),
        );

        nextCursor = page.nextCursor ?? null;
        rawHistoryExhausted = !page.hasNextPage || nextCursor === null;
    }

    const data = matches.slice(0, limit);
    const buffered = matches.slice(limit);

    if (rawHistoryExhausted && buffered.length === 0) {
        return { data, nextPageParam: null, hasNextPage: false };
    }

    return {
        data,
        nextPageParam: { cursor: nextCursor, buffered, rawHistoryExhausted },
        hasNextPage: true,
    };
}
