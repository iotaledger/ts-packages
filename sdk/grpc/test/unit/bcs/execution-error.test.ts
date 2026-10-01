// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bcs, fromHex, toHex } from '@iota/bcs';
import { describe, expect, it } from 'vitest';

import { ExecutionError } from '../../../src/bcs/execution-error.js';
import { minimalBcs, readAbnfRule } from '../../abnf.js';

/**
 * Effects of failed transactions, one per error variant seen on the network.
 * Effects start with the V1 tag and the Failure status, so the error starts
 * at byte 2 and is followed by the optional command index and the epoch.
 */
interface ExecutionErrorsFixture {
    source: { network: string; capturedAt: string };
    failures: {
        tag: number;
        checkpoint: string;
        transaction: string;
        epoch: string;
        effectsBcs: string;
    }[];
}

const fixture: ExecutionErrorsFixture = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../fixtures/execution-errors.json'), 'utf8'),
);

const ERROR_OFFSET = 2;

/** Every `$kind` in a decoded value, so assertions do not depend on payload field names. */
function kinds(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.flatMap(kinds);
    }
    if (value && typeof value === 'object' && !(value instanceof Uint8Array)) {
        const own = '$kind' in value ? [String(value.$kind)] : [];
        return [...own, ...Object.values(value).flatMap(kinds)];
    }
    return [];
}

function strings(value: unknown): string[] {
    if (typeof value === 'string') {
        return [value];
    }
    if (value && typeof value === 'object' && !(value instanceof Uint8Array)) {
        return Object.values(value).flatMap(strings);
    }
    return [];
}

describe.each(fixture.failures.map((failure) => [failure.tag, failure] as const))(
    'ExecutionError, failed %s transaction',
    (_, failure) => {
        const effects = fromHex(failure.effectsBcs);
        const error = ExecutionError.parse(effects.slice(ERROR_OFFSET));
        const encoded = ExecutionError.serialize(error).toBytes();
        const variant = readAbnfRule('execution-error')[failure.tag].name;

        it('decodes to the variant its tag names', () => {
            expect(error.$kind).toBe(variant);
        });

        it('re-encodes to the bytes it was read from', () => {
            expect(toHex(encoded)).toBe(
                toHex(effects.slice(ERROR_OFFSET, ERROR_OFFSET + encoded.length)),
            );
        });

        it('ends exactly where the command index and the epoch of the effects begin', () => {
            let offset = ERROR_OFFSET + encoded.length;
            const hasCommand = effects[offset];
            expect([0, 1]).toContain(hasCommand);
            offset += 1 + (hasCommand ? 8 : 0);

            expect(bcs.u64().parse(effects.slice(offset, offset + 8))).toBe(failure.epoch);
        });
    },
);

describe('ExecutionError, MoveAbort from testnet', () => {
    const failure = fixture.failures.find(({ tag }) => tag === 12)!;
    const error = ExecutionError.parse(fromHex(failure.effectsBcs).slice(ERROR_OFFSET));

    it('names the module and package the abort came from', () => {
        expect(strings(error)).toContain('dynamic_field');
        expect(strings(error)).toContain(`0x${'0'.repeat(63)}2`);
    });
});

describe.each(readAbnfRule('execution-error').map(({ name, body }) => [name!, body] as const))(
    'ExecutionError variant %s',
    (name, body) => {
        const bytes = Uint8Array.from(minimalBcs(body));

        it('decodes its tag to the Rust variant name', () => {
            expect(ExecutionError.parse(bytes).$kind).toBe(name);
        });

        it('round-trips its smallest payload', () => {
            expect(toHex(ExecutionError.serialize(ExecutionError.parse(bytes)).toBytes())).toBe(
                toHex(bytes),
            );
        });
    },
);

/** Nested enums, reached through the variant that carries them and the bytes before them. */
const NESTED = [
    ['command-argument-error', 'CommandArgumentError', [19, 0, 0]],
    ['type-argument-error', 'TypeArgumentError', [20, 0, 0]],
    ['package-upgrade-error', 'PackageUpgradeError', [27]],
    ['execution-error', 'MoveAuthentication', [39]],
] as const;

describe.each(NESTED)('nested %s, inside %s', (rule, host, prefix) => {
    it.each(readAbnfRule(rule).map(({ name, body }) => [name!, body] as const))(
        '%s',
        (name, body) => {
            const bytes = Uint8Array.from([...prefix, ...minimalBcs(body)]);
            const error = ExecutionError.parse(bytes);

            expect(error.$kind).toBe(host);
            expect(kinds(error)).toContain(name);
            expect(toHex(ExecutionError.serialize(error).toBytes())).toBe(toHex(bytes));
        },
    );
});

describe('ExecutionError', () => {
    it('rejects a variant past the last one', () => {
        const next = readAbnfRule('execution-error').length;

        expect(() => ExecutionError.parse(Uint8Array.from([next]))).toThrow();
    });

    it('rejects truncated bytes', () => {
        const moveAbort = minimalBcs(readAbnfRule('execution-error')[12].body);

        expect(() => ExecutionError.parse(Uint8Array.from(moveAbort.slice(0, -1)))).toThrow();
    });
});
