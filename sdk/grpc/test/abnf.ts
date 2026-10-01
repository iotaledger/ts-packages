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
    const head = new RegExp(`^${rule}\\s+=`);
    const start = lines.findIndex((line) => head.test(line));
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
                .replace(offset === 0 ? head : '', '')
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

/**
 * The smallest bytes a grammar body accepts: the first alternative of every
 * choice, empty sequences, absent options and zeroed fixed-width fields. Lets a
 * test reach enum variants that no fixture covers.
 */
export function minimalBcs(body: string): number[] {
    return tokens(body).flatMap(minimalToken);
}

function minimalToken(token: string): number[] {
    if (token.startsWith('(')) {
        return minimalBcs(firstAlternative(token.slice(1, -1)));
    }
    if (token.startsWith('*')) {
        return [];
    }
    if (token === 'size') {
        return [0];
    }

    const literal = /^%d(\d+)$/.exec(token);
    if (literal) {
        return [Number(literal[1])];
    }

    const octets = /^(\d+)OCTET$/.exec(token);
    if (octets) {
        return Array.from({ length: Number(octets[1]) }, () => 0);
    }

    const terms = readAbnfRule(token);
    return terms[0].body.startsWith('%d')
        ? minimalBcs(terms[0].body)
        : terms.flatMap(({ body }) => minimalBcs(body));
}

function firstAlternative(group: string): string {
    const parts = splitTopLevel(group, '/');
    return parts[0].trim();
}

function tokens(body: string): string[] {
    return splitTopLevel(body, ' ').filter(Boolean);
}

function splitTopLevel(text: string, separator: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const char of text) {
        depth += char === '(' ? 1 : char === ')' ? -1 : 0;
        if (char === separator && depth === 0) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current);
    return parts;
}
