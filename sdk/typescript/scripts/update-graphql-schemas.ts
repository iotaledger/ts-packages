// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path, { resolve } from 'node:path';
import TOML from '@iarna/toml';
import {
    createSchemaTsConfigFile,
    generateSchema,
    createSchemaIndexFile,
    addExportsToPackageJson,
} from './generate-schema-lib.js';

const LATEST = 'latest';

// a schema version: the `MAJOR.MINOR.PATCH` release of the iota node, e.g. `1.33.0`
const SCHEMA_VERSION = /^\d+\.\d+\.\d+$/;

// comment in the `latest` index file with the node version it was generated from
const LATEST_VERSION_COMMENT = '// GraphQL schema of iota node';
const LATEST_VERSION_LINE = new RegExp(`^${LATEST_VERSION_COMMENT} (.*)$`, 'm');

const packageRoot = path.resolve(import.meta.url.slice(5), '../..');
const workspaceRoot = path.resolve(packageRoot, '../..');
const schemaSourceFilePath = path.resolve(
    workspaceRoot,
    'external/iota/crates/iota-graphql-rpc',
    'schema.graphql',
);
const nodeCargoTomlPath = path.resolve(workspaceRoot, 'external/iota/Cargo.toml');
const latestSchemaPath = resolve(packageRoot, `src/graphql/generated/${LATEST}/schema.graphql`);
const latestIndexPath = resolve(packageRoot, `src/graphql/schemas/${LATEST}/index.ts`);

// creates the stub package.json used by resolvers that don't support the `exports` field
async function createSchemaStubPackageJson(name: string) {
    const stubFolder = resolve(packageRoot, `graphql/schemas/${name}/`);
    await mkdir(stubFolder, { recursive: true });

    const stub = {
        private: true,
        import: `../../../dist/esm/graphql/schemas/${name}/index.js`,
        main: `../../../dist/cjs/graphql/schemas/${name}/index.js`,
        sideEffects: false,
    };

    await writeFile(resolve(stubFolder, 'package.json'), `${JSON.stringify(stub, null, '    ')}\n`);
}

// regenerates every file of a schema version (types, index, stub and export) from its own schema.graphql
async function regenerateSchemaVersion(name: string) {
    const targetFolderGenerated = resolve(packageRoot, `src/graphql/generated/${name}/`);
    const targetFolderSchemas = resolve(packageRoot, `src/graphql/schemas/${name}/`);

    if (!existsSync(resolve(targetFolderGenerated, 'schema.graphql'))) {
        throw new Error(`Missing schema.graphql for GraphQL schema version ${name}`);
    }

    await mkdir(targetFolderSchemas, { recursive: true });

    await createSchemaTsConfigFile(targetFolderGenerated, name);
    await generateSchema(targetFolderGenerated);
    await createSchemaIndexFile(targetFolderSchemas, name);
    await createSchemaStubPackageJson(name);

    // add exports to package.json
    await addExportsToPackageJson(packageRoot, [name]);
}

// copies a source schema into a schema version and generates all of its files
async function writeSchemaVersion(name: string, sourceSchemaPath: string) {
    const targetFolderGenerated = resolve(packageRoot, `src/graphql/generated/${name}/`);

    await mkdir(targetFolderGenerated, { recursive: true });
    await copyFile(sourceSchemaPath, resolve(targetFolderGenerated, 'schema.graphql'));

    await regenerateSchemaVersion(name);
}

// checks whether two schema files exist and have the same content
async function isSameSchema(schemaPath: string, otherSchemaPath: string) {
    return (
        existsSync(schemaPath) &&
        existsSync(otherSchemaPath) &&
        (await readFile(schemaPath, 'utf-8')) === (await readFile(otherSchemaPath, 'utf-8'))
    );
}

// checks that a version is a `MAJOR.MINOR.PATCH` schema version
function assertSchemaVersion(
    version: string | undefined,
    source: string,
): asserts version is string {
    if (!version || !SCHEMA_VERSION.test(version)) {
        throw new Error(`Invalid GraphQL schema version "${version ?? ''}" in ${source}`);
    }
}

// reads the `MAJOR.MINOR.PATCH` release of the iota node, without its prerelease suffix (e.g. `-alpha`)
async function readNodeVersion() {
    const cargoToml = TOML.parse(await readFile(nodeCargoTomlPath, 'utf-8')) as {
        workspace?: { package?: { version?: string } };
    };
    const version = cargoToml.workspace?.package?.version?.split('-')[0];
    assertSchemaVersion(version, nodeCargoTomlPath);

    return version;
}

// reads the node version the current `latest` was generated from, stored as a comment in its index
// file; undefined when there is no `latest` yet
async function readCurrentLatest() {
    if (!existsSync(latestIndexPath)) {
        return undefined;
    }

    const version = (await readFile(latestIndexPath, 'utf-8')).match(LATEST_VERSION_LINE)?.[1];
    assertSchemaVersion(version, latestIndexPath);

    return version;
}

// stores the node version the current `latest` was generated from as a comment in its index file,
// right after the license header
async function writeCurrentLatest(version: string) {
    const [licenseHeader, ...code] = (await readFile(latestIndexPath, 'utf-8')).split('\n\n');

    await writeFile(
        latestIndexPath,
        [licenseHeader, `${LATEST_VERSION_COMMENT} ${version}`, ...code].join('\n\n'),
    );
}

// copies the `latest` schema into its version and generates all of its files
async function freezeLatestSchema(version: string) {
    await writeSchemaVersion(version, latestSchemaPath);
}

// `latest` follows the schema of the iota node in the submodule, and its index file stores the node
// version it was generated from. A schema change in a new node version freezes `latest` under the
// previous one.
const newLatestVersion = await readNodeVersion();
const oldLatestVersion = await readCurrentLatest();

// 1. check whether the node version and the node schema have changed
const hasNewVersion = oldLatestVersion !== undefined && newLatestVersion !== oldLatestVersion;
const hasNewSchema = !(await isSameSchema(schemaSourceFilePath, latestSchemaPath));

if (!hasNewSchema) {
    console.log(
        `GraphQL schema of iota node ${newLatestVersion} is unchanged, ${LATEST} (${oldLatestVersion}) is up to date`,
    );
} else {
    // 2. a new node version freezes the old latest
    if (hasNewVersion) {
        await freezeLatestSchema(oldLatestVersion);
    }

    // 3. update latest with the new node schema and reference its node version
    await writeSchemaVersion(LATEST, schemaSourceFilePath);
    await writeCurrentLatest(newLatestVersion);

    console.log(
        hasNewVersion
            ? `Froze GraphQL schema ${oldLatestVersion} and updated ${LATEST} to ${newLatestVersion}`
            : `Updated ${LATEST} (${newLatestVersion}) with the new GraphQL schema`,
    );
}
