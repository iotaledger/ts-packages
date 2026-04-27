// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { defineConfig } from 'vitest/config';

process.env.VITE_VERCEL_ENV = process.env.VERCEL_ENV || 'development';

export default defineConfig({
    plugins: [vanillaExtractPlugin()],
    resolve: {
        alias: {
            '@iota/iota-sdk/client': new URL('../../sdk/typescript/src/client', import.meta.url)
                .pathname,
            '@iota/iota-sdk/utils': new URL('../../sdk/typescript/src/utils', import.meta.url)
                .pathname,
            '@iota/iota-sdk/transactions': new URL(
                '../../sdk/typescript/src/transactions',
                import.meta.url,
            ).pathname,
            '@iota/apps-ui-icons': new URL('../ui-icons/src', import.meta.url).pathname,
            '@iota/bcs': new URL('../../sdk/bcs/src', import.meta.url).pathname,
        },
    },
});
