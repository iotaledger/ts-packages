// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type {
    SubscribeEventsSubscription,
    SubscribeTransactionsSubscription,
    SubscriptionEventFilter,
    SubscriptionTransactionFilter,
} from '../generated/queries.js';
import { toShortTypeString } from './util.js';

type SubscriptionEvent = Exclude<SubscribeEventsSubscription['events'], { __typename?: 'Lagged' }>;

type SubscriptionTransaction = Exclude<
    SubscribeTransactionsSubscription['transactions'],
    { __typename?: 'Lagged' }
>;

/**
 * Maps a JSON-RPC `IotaEventFilter` to the GraphQL `SubscriptionEventFilter`.
 *
 * The GraphQL subscription API only supports filtering by `emittingModule`,
 * which corresponds to the `Package` and `MoveModule` RPC filters.
 */
export function mapRpcEventFilterToGraphQL(
    rpcFilter: Record<string, unknown>,
): SubscriptionEventFilter | undefined {
    if ('Package' in rpcFilter) {
        return { emittingModule: rpcFilter.Package as string };
    }

    if ('MoveModule' in rpcFilter) {
        const mod = rpcFilter.MoveModule as { package: string; module: string };
        return { emittingModule: `${mod.package}::${mod.module}` };
    }

    if ('MoveEventType' in rpcFilter) {
        const parts = (rpcFilter.MoveEventType as string).split('::');
        if (parts.length >= 2) {
            return { emittingModule: `${parts[0]}::${parts[1]}` };
        }
    }

    if ('MoveEventModule' in rpcFilter) {
        const mod = rpcFilter.MoveEventModule as { package: string; module: string };
        return { emittingModule: `${mod.package}::${mod.module}` };
    }

    return undefined;
}

export function mapRpcTransactionFilterToGraphQL(
    rpcFilter: Record<string, unknown>,
): SubscriptionTransactionFilter | undefined {
    if ('TransactionKind' in rpcFilter) {
        return {
            kind: rpcFilter.TransactionKind as SubscriptionTransactionFilter & {
                kind: unknown;
            } extends { kind: infer K }
                ? K
                : never,
        } as SubscriptionTransactionFilter;
    }

    if ('FromAddress' in rpcFilter) {
        return {
            signingAddress: rpcFilter.FromAddress as string,
        } as SubscriptionTransactionFilter;
    }

    if ('MoveFunction' in rpcFilter) {
        const fn = rpcFilter.MoveFunction as {
            package: string;
            module?: string | null;
            function?: string | null;
        };
        let value = fn.package;
        if (fn.module) {
            value += `::${fn.module}`;
            if (fn.function) {
                value += `::${fn.function}`;
            }
        }
        return { function: value } as SubscriptionTransactionFilter;
    }

    return undefined;
}

export function mapSubscriptionEvent(event: SubscriptionEvent) {
    return {
        bcs: event.bcs,
        id: {
            eventSeq: '', // TODO
            txDigest: '', // TODO
        },
        packageId: event.sendingModule?.package.address ?? '',
        parsedJson: event.json,
        sender: event.sender?.address,
        timestampMs: event.timestamp
            ? new Date(event.timestamp as string).getTime().toString()
            : undefined,
        transactionModule: event.sendingModule
            ? `${event.sendingModule.package.address}::${event.sendingModule.name}`
            : '',
        type: toShortTypeString(event.type?.repr) ?? '',
    };
}

export function mapSubscriptionTransaction(tx: SubscriptionTransaction) {
    return {
        bcs: tx.effects?.bcs,
        digest: tx.digest,
        ...(tx.effects?.timestamp
            ? {
                  timestampMs: new Date(tx.effects.timestamp as string).getTime().toString(),
              }
            : {}),
    };
}
