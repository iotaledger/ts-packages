// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

// TypeScript 7 ships no JavaScript compiler API, so tools that load `typescript` programmatically
// get their own TypeScript 6 instead of resolving the workspace TypeScript 7 as a peer.
const TYPESCRIPT_API_CONSUMERS = new Set([
    '@0no-co/graphqlsp',
    '@gql.tada/cli-utils',
    '@gql.tada/internal',
    '@joshwooding/vite-plugin-react-docgen-typescript',
    'react-docgen-typescript',
    'typedoc',
]);

const TYPESCRIPT_API_VERSION = 'npm:typescript@^6.0.3';

function readPackage(pkg) {
    if (TYPESCRIPT_API_CONSUMERS.has(pkg.name)) {
        delete pkg.peerDependencies?.typescript;
        delete pkg.peerDependenciesMeta?.typescript;
        pkg.dependencies = { ...pkg.dependencies, typescript: TYPESCRIPT_API_VERSION };
    }
    return pkg;
}

module.exports = { hooks: { readPackage } };
