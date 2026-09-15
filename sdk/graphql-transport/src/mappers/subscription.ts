// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { IotaTransactionBlockResponse, IotaTransactionKind } from '@iota/iota-sdk/client';

import type {
    SubscribeEventsSubscription,
    SubscribeTransactionsSubscription,
    SubscriptionEventFilter,
    SubscriptionTransactionFilter,
} from '../generated/queries.js';
import { UnsupportedParamError } from '../methods.js';
import { mapEffects } from './transaction-block.js';
import { toGraphQLTransactionKind, toShortTypeString } from './util.js';

type SubscriptionEvent = Extract<SubscribeEventsSubscription['events'], { __typename: 'Event' }>;

type SubscriptionTransaction = Extract<
    SubscribeTransactionsSubscription['transactions'],
    { __typename: 'TransactionBlock' }
>;

/**
 * Maps a JSON-RPC `IotaEventFilter` to the GraphQL `SubscriptionEventFilter`, which only
 * supports `emittingModule`. Anything that cannot be expressed exactly throws
 * `UnsupportedParamError` so the transport can hand the subscription to JSON-RPC rather than
 * dropping the filter and streaming everything. An empty filter means no filter.
 */
export function mapRpcEventFilterToGraphQL(
    rpcFilter: Record<string, unknown>,
): SubscriptionEventFilter | undefined {
    const [param] = Object.keys(rpcFilter);

    if (!param) {
        return undefined;
    }

    if ('Package' in rpcFilter) {
        return { emittingModule: rpcFilter.Package as string };
    }

    if ('MoveModule' in rpcFilter) {
        const mod = rpcFilter.MoveModule as { package: string; module: string };
        return { emittingModule: `${mod.package}::${mod.module}` };
    }

    if ('MoveEventModule' in rpcFilter) {
        const mod = rpcFilter.MoveEventModule as { package: string; module: string };
        return { emittingModule: `${mod.package}::${mod.module}` };
    }

    throw new UnsupportedParamError('iotax_subscribeEvent', param);
}

export function mapRpcTransactionFilterToGraphQL(
    rpcFilter: Record<string, unknown>,
): SubscriptionTransactionFilter | undefined {
    const [param] = Object.keys(rpcFilter);

    if (!param) {
        return undefined;
    }

    if ('TransactionKind' in rpcFilter) {
        const kind = toGraphQLTransactionKind(rpcFilter.TransactionKind as IotaTransactionKind);

        if (!kind) {
            throw new UnsupportedParamError(
                'iotax_subscribeTransaction',
                `TransactionKind ${String(rpcFilter.TransactionKind)}`,
            );
        }

        return { kind };
    }

    if ('FromAddress' in rpcFilter) {
        return { signingAddress: rpcFilter.FromAddress as string };
    }

    if ('MoveFunction' in rpcFilter) {
        const fn = rpcFilter.MoveFunction as {
            package: string;
            module?: string | null;
            function?: string | null;
        };

        // The GraphQL filter is a package/module/function prefix, so a function name cannot
        // be expressed without the module that holds it.
        if (fn.function && !fn.module) {
            throw new UnsupportedParamError(
                'iotax_subscribeTransaction',
                'MoveFunction without a module',
            );
        }

        const parts = [fn.package, fn.module, fn.function].filter(Boolean);
        return { function: parts.join('::') };
    }

    throw new UnsupportedParamError('iotax_subscribeTransaction', param);
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

/**
 * `iotax_subscribeTransaction` delivers `TransactionEffects`, so the subscription selects the
 * effects BCS and decodes it through the same mapper the query path uses. Returns undefined
 * when the node sent a transaction without effects, which there is nothing useful to emit for.
 */
export function mapSubscriptionTransaction(
    tx: SubscriptionTransaction,
): IotaTransactionBlockResponse['effects'] {
    return tx.effects?.bcs ? mapEffects(tx.effects.bcs) : undefined;
}
