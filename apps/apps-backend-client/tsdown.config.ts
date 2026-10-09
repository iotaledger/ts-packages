// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: { index: 'src/index.ts' },
    format: ['esm', 'umd'],
    platform: 'browser',
    globalName: '@iota/apps-backend-client',
    outputOptions: {
        globals: {
            react: 'React',
            'react/jsx-runtime': 'jsxRuntime',
        },
    },
    outExtensions: ({ format }) =>
        format === 'es' ? { js: '.es.js', dts: '.d.ts' } : { js: '.js' },
    dts: true,
    sourcemap: true,
});
