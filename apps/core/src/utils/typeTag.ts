// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { parseStructTag } from '@iota/iota-sdk/utils';

type StructTag = ReturnType<typeof parseStructTag>;

export function tryParseStructTag(type: string): StructTag | null {
    try {
        return parseStructTag(type);
    } catch {
        return null;
    }
}

/** Formats `0x2::balance::Balance<0x2::iota::IOTA>` as `Balance<IOTA>`. */
export function formatTypeTag(type: string): string {
    const tag = tryParseStructTag(type);

    // Primitives and anything unparsable are already written as displayed.
    return tag ? formatStructTag(tag) : type;
}

/** The symbol a coin falls back to when it has no metadata on chain. */
export function getCoinSymbol(coinType: string): string {
    return tryParseStructTag(coinType)?.name ?? coinType;
}

function formatStructTag({ name, typeParams }: StructTag): string {
    if (!typeParams.length) {
        return name;
    }

    const args = typeParams.map((param) =>
        typeof param === 'string' ? formatTypeTag(param) : formatStructTag(param),
    );

    return `${name}<${args.join(', ')}>`;
}
