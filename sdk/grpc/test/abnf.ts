// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Generated from the Rust types by `iota-sdk-bcs-schema`. Read from the
 * submodule the protos come from, so bumping it fails the parity tests until
 * the TypeScript schemas catch up.
 */
export const BCS_SCHEMA_ABNF = path.resolve(
    __dirname,
    '../../../external/iota-rust-sdk/crates/iota-sdk-types/bcs-schema.abnf',
);

export interface AbnfTerm {
    /** The grammar on this line, without the alternation slash or comment. */
    body: string;
    /** The trailing `; name` comment: a field name for structs, a variant name for enums. */
    name: string | undefined;
}

/**
 * The terms of one rule, one per line as the generator emits them. A struct
 * yields its fields in order and an enum its variants, each body starting with
 * the `%dNN` tag.
 */
export function readAbnfRule(rule: string): AbnfTerm[] {
    const lines = readFileSync(BCS_SCHEMA_ABNF, 'utf8').split('\n');
    const start = lines.findIndex((line) => line.startsWith(`${rule} =`));
    if (start === -1) {
        throw new Error(`no ABNF rule '${rule}'`);
    }

    const terms: AbnfTerm[] = [];
    for (const [offset, line] of lines.slice(start).entries()) {
        if (offset > 0 && !/^\s+\S/.test(line)) {
            break;
        }

        const [grammar, comment] = line.split(';');
        terms.push({
            body: grammar
                .replace(offset === 0 ? `${rule} =` : '', '')
                .replace(/^\s*\/\s*/, '')
                .trim(),
            name: comment?.trim(),
        });
    }

    return terms;
}

export function kebabToCamel(name: string): string {
    return name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}
