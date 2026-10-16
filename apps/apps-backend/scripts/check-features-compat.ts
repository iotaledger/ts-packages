// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ConfigService } from '@nestjs/config';
import { FeaturesController } from '../src/features/features.controller';

type Definition = { defaultValue?: unknown; minVersion?: string };

function kind(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function compare(path: string, before: unknown, after: unknown, breaks: string[]): void {
    if (before === undefined) return;
    if (after === undefined) {
        breaks.push(`${path} was removed`);
        return;
    }
    if (kind(before) !== kind(after)) {
        breaks.push(`${path} changed from ${kind(before)} to ${kind(after)}`);
        return;
    }
    if (Array.isArray(before)) {
        compare(`${path}[]`, before[0], (after as unknown[])[0], breaks);
    } else if (kind(before) === 'object') {
        for (const key of Object.keys(before as object)) {
            compare(`${path}.${key}`, before[key], after[key], breaks);
        }
    }
}

async function main() {
    const prodBackend = process.env.PROD_APPS_BACKEND;
    if (!prodBackend) throw new Error('PROD_APPS_BACKEND is not configured');
    const prodFeaturesUrl = `${prodBackend}/api/features`;
    const res = await fetch(prodFeaturesUrl);
    if (!res.ok) throw new Error(`Failed to fetch ${prodFeaturesUrl}: ${res.status}`);
    const prod: Record<string, Definition> = (await res.json()).features;

    const config = { get: () => 'production' } as unknown as ConfigService;
    const head: Record<string, Definition> = new FeaturesController(config).getFeatures().features;

    const breaks: string[] = [];
    for (const [key, definition] of Object.entries(prod)) {
        if (!(key in head)) {
            breaks.push(`${key} was removed`);
            continue;
        }
        compare(key, definition.defaultValue, head[key].defaultValue, breaks);
        if (head[key].minVersion && !definition.minVersion) {
            breaks.push(`${key} gained a minVersion, which clients already reading it may ignore`);
        }
    }

    if (breaks.length) {
        console.error(
            `Breaking feature flag changes compared to production:\n${breaks.map((b) => `  - ${b}`).join('\n')}\n` +
                'Released clients read these flags. Keep the existing key and shape, and add a new key (e.g. `CoinRegistryV2`) with a `minVersion` instead.',
        );
        process.exit(1);
    }
    console.log('Feature flags are compatible with production.');
}

main();
