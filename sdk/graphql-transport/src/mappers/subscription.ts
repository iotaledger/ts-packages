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
 * `SubscriptionEventFilter` only supports `emittingModule`, the module that emitted the
 * event. `MoveEventModule` selects the module the struct was declared in, a different set.
 * An empty filter means no filter; anything inexpressible throws so the caller falls back.
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

        // The filter is a package/module/function prefix.
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
        bcsEncoding: 'base64',
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

/** `iotax_subscribeTransaction` delivers `TransactionEffects`, decoded from the effects BCS. */
export function mapSubscriptionTransaction(
    tx: SubscriptionTransaction,
): IotaTransactionBlockResponse['effects'] {
    return tx.effects?.bcs ? mapEffects(tx.effects.bcs) : undefined;
}
