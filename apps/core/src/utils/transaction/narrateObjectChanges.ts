// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ObjectOwner } from '@iota/iota-sdk/client';

import { COIN_TYPE } from '../../constants';
import { type IotaObjectChangeWithDisplay } from '../../types';

export type NarratedObjectChange = {
    /** The raw change object including any fetched display data. */
    change: IotaObjectChangeWithDisplay;
    /** Display name from on-chain Display metadata, if available. */
    name?: string;
    /** Recipient address — only populated for the `sent` bucket. */
    recipient?: string;
};

export type NarratedObjectChanges = {
    /** Non-coin objects unwrapped and now owned by the perspective address. */
    received: NarratedObjectChange[];
    /** Non-coin objects transferred from the perspective address to someone else. */
    sent: NarratedObjectChange[];
    /** Non-coin objects created and assigned to the perspective address (minted by a contract). */
    minted: NarratedObjectChange[];
    /** Packages published or upgraded in this transaction. */
    published: NarratedObjectChange[];
    /** Everything else: gas coin mutations, change coins, wrapped/deleted objects, etc. */
    internal: NarratedObjectChange[];
};

function isCoin(objectType: string): boolean {
    return objectType.startsWith(COIN_TYPE);
}

function ownerToAddress(owner: ObjectOwner): string {
    if (typeof owner === 'object') {
        if ('AddressOwner' in owner) return owner.AddressOwner;
        if ('ObjectOwner' in owner) return owner.ObjectOwner;
        if ('Shared' in owner) return 'Shared';
    }
    return '';
}

function toNarrated(
    change: IotaObjectChangeWithDisplay,
    extra?: { recipient?: string },
): NarratedObjectChange {
    return {
        change,
        name: change.display?.data?.['name'] ?? undefined,
        ...extra,
    };
}

/**
 * Classify object changes into human-readable buckets from a single address perspective.
 *
 * When `ctx.currentAddress` is absent, `ctx.sender` is used as the perspective so
 * the same function works for explorer (no logged-in address) and wallet views.
 */
export function narrateObjectChanges(
    changes: IotaObjectChangeWithDisplay[],
    ctx: { currentAddress?: string; sender?: string; gasObjectId?: string },
): NarratedObjectChanges {
    const perspective = ctx.currentAddress ?? ctx.sender;

    const result: NarratedObjectChanges = {
        received: [],
        sent: [],
        minted: [],
        published: [],
        internal: [],
    };

    for (const change of changes) {
        switch (change.type) {
            case 'published': {
                result.published.push(toNarrated(change));
                break;
            }

            case 'transferred': {
                const recipientAddr = ownerToAddress(change.recipient);
                const isFromPerspective = change.sender === perspective;
                const isToSelf = recipientAddr === perspective;

                if (isFromPerspective && !isToSelf && !isCoin(change.objectType)) {
                    result.sent.push(toNarrated(change, { recipient: recipientAddr }));
                } else {
                    result.internal.push(toNarrated(change));
                }
                break;
            }

            case 'created': {
                const ownerAddr = ownerToAddress(change.owner);
                if (!isCoin(change.objectType) && ownerAddr === perspective) {
                    result.minted.push(toNarrated(change));
                } else {
                    result.internal.push(toNarrated(change));
                }
                break;
            }

            case 'unwrapped': {
                const ownerAddr = ownerToAddress(change.owner);
                if (!isCoin(change.objectType) && ownerAddr === perspective) {
                    result.received.push(toNarrated(change));
                } else {
                    result.internal.push(toNarrated(change));
                }
                break;
            }

            default:
                // mutated, deleted, wrapped → always internal (includes gas coin)
                result.internal.push(toNarrated(change));
        }
    }

    return result;
}
