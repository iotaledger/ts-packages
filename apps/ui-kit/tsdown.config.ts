// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: { index: 'src/lib/index.ts' },
    format: ['esm', 'umd'],
    platform: 'browser',
    globalName: '@iota/apps-ui-kit',
    deps: {
        neverBundle: ['react', 'react-dom', 'react/jsx-runtime', 'tailwindcss'],
        alwaysBundle: [/.*/],
    },
    outputOptions: {
        globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            tailwindcss: 'tailwindcss',
        },
    },
    outExtensions: ({ format }) =>
        format === 'es' ? { js: '.es.js', dts: '.d.ts' } : { js: '.js' },
    dts: true,
    css: { fileName: 'style.css', transformer: 'postcss' },
    sourcemap: true,
    minify: true,
});
