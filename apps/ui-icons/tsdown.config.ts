// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: 'src/index.ts',
    format: ['cjs', 'esm'],
    dts: true,
    outExtensions: ({ format }) =>
        format === 'cjs' ? { js: '.js', dts: '.d.ts' } : { js: '.mjs', dts: '.d.mts' },
});
