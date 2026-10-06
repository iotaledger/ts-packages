// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ObjectOwner, type IotaObjectResponse } from '@iota/iota-sdk/client';
import { normalizeIotaAddress, normalizeStructTag, parseStructTag } from '@iota/iota-sdk/utils';

import { findIPFSvalue } from '@iota/core';

export function parseImageURL(display?: Record<string, string> | null): string {
    const url = display?.image_url;
    if (url) {
        if (findIPFSvalue(url)) return url;
        // String representing true http/https URLs are valid:
        try {
            new URL(url);
            return url;
        } catch {
            //do nothing
        }
    }
    return '';
}

export function parseObjectType(data: IotaObjectResponse): string {
    if (data.data?.content?.dataType === 'package') {
        return 'Move Package';
    }
    return data.data?.type ?? data?.data?.content?.type ?? 'unknown';
}

// Framework objects that belong to a single coin, which is their type parameter.
const COIN_OBJECT_STRUCTS = new Set([
    'coin::Coin',
    'coin::CoinMetadata',
    'coin::TreasuryCap',
    'coin_manager::CoinManager',
]);

/**
 * The coin type a `Coin<T>`, `CoinMetadata<T>`, `TreasuryCap<T>` or
 * `CoinManager<T>` object belongs to, or null for any other object.
 */
export function getCoinTypeOfObject(objectType: string): string | null {
    try {
        const { address, module, name, typeParams } = parseStructTag(objectType);
        const [coinType] = typeParams;
        if (
            address !== normalizeIotaAddress('0x2') ||
            !COIN_OBJECT_STRUCTS.has(`${module}::${name}`) ||
            !coinType
        ) {
            return null;
        }
        return normalizeStructTag(coinType);
    } catch {
        return null;
    }
}

export function getOwnerStr(owner: ObjectOwner | string): string {
    if (typeof owner === 'object') {
        if ('AddressOwner' in owner) return owner.AddressOwner;
        if ('ObjectOwner' in owner) return owner.ObjectOwner;
        if ('Shared' in owner) return 'Shared';
    }
    return owner;
}

export const checkIsPropertyType = (value: unknown): boolean =>
    ['number', 'string'].includes(typeof value);

export const extractName = (display?: Record<string, string> | null): string | null | undefined => {
    if (!display || !('name' in display)) return undefined;
    const name = display.name;
    if (typeof name === 'string') {
        return name;
    }
    return null;
};

export function getDisplayUrl(url?: string): { href: string; display: string } | string | null {
    if (url) {
        try {
            const parsedUrl = new URL(url);
            return {
                href: url,
                display: parsedUrl.hostname,
            };
        } catch (e) {
            // do nothing
        }
    }
    return url || null;
}
