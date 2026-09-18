// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import docRender from './src/plugins/doc-render';

function resolveCommitRev(): string {
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
        return process.env.VERCEL_GIT_COMMIT_SHA;
    }

    try {
        return execSync('git rev-parse HEAD').toString().trim();
    } catch {
        return 'unknown';
    }
}

const COMMIT_REV = resolveCommitRev();

// https://vitejs.dev/config/
export default defineConfig({
    define: {
        COMMIT_REV: JSON.stringify(COMMIT_REV),
    },
    plugins: [
        react(),
        tsconfigPaths(),
        {
            name: 'doc-data',
            resolveId(id) {
                if (id === '@doc-data') {
                    return id;
                }
            },
            load(id) {
                if (id === '@doc-data') {
                    const data = docRender();
                    return `export default ${JSON.stringify(data.content)}`;
                }
            },
        },
    ],
});
