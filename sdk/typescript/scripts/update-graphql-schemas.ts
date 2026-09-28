// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path, { dirname, resolve } from 'node:path';
import {
    createSchemaTsConfigFile,
    generateSchema,
    createSchemaIndexFile,
    addExportsToPackageJson,
} from './generate-schema-lib.js';

const LATEST = 'latest';

// a version list item in the versions file, e.g. `2025.2` or `2026.9.0`
const SCHEMA_VERSION_LINE = /^-\s+(\d{4}\.\d{1,2}(?:\.\d+)?)$/;

const packageRoot = path.resolve(import.meta.url.slice(5), '../..');
const workspaceRoot = path.resolve(packageRoot, '../..');
const schemaSourceFilePath = path.resolve(
    workspaceRoot,
    'external/iota/crates/iota-graphql-rpc',
    'schema.graphql',
);
const latestSchemaPath = resolve(packageRoot, `src/graphql/generated/${LATEST}/schema.graphql`);
const versionsFilePath = resolve(packageRoot, 'scripts/graphql-schema-versions.md');

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

// copies the `latest` schema into the version it is referenced by; an already frozen version is
// never overwritten
async function freezeLatestSchema(version: string) {
    const frozenSchemaPath = resolve(
        packageRoot,
        `src/graphql/generated/${version}/schema.graphql`,
    );

    if (existsSync(frozenSchemaPath)) {
        if (
            existsSync(latestSchemaPath) &&
            !(await isSameSchema(frozenSchemaPath, latestSchemaPath))
        ) {
            throw new Error(
                `GraphQL schema version ${version} is already frozen with a different schema than ${LATEST}`,
            );
        }
        return;
    }

    await mkdir(dirname(frozenSchemaPath), { recursive: true });
    await copyFile(latestSchemaPath, frozenSchemaPath);
}

// reads the schema versions listed in the versions file
async function readSchemaVersions() {
    const content = await readFile(versionsFilePath, 'utf-8');

    return content
        .split('\n')
        .map((line) => line.trim().match(SCHEMA_VERSION_LINE)?.[1])
        .filter((version): version is string => version !== undefined);
}

// appends a schema version to the versions file, using the list style prettier formats to
async function appendSchemaVersion(version: string) {
    const content = await readFile(versionsFilePath, 'utf-8');

    await writeFile(versionsFilePath, `${content.trimEnd()}\n-   ${version}\n`);
}

// returns the `YYYY.M.PATCH` version for the given date, bumping the patch if the month already has one
function getNextSchemaVersion(versions: string[], date: Date) {
    const month = `${date.getUTCFullYear()}.${date.getUTCMonth() + 1}`;
    const patches = versions
        .filter((version) => version.startsWith(`${month}.`))
        .map((version) => Number(version.slice(month.length + 1)));

    const patch = patches.length > 0 ? Math.max(...patches) + 1 : 0;

    return `${month}.${patch}`;
}

// the last version of the versions file references the schema currently in `latest`: when the
// iota submodule schema changes, freeze `latest`, regenerate every frozen version, generate a new
// `latest` from the submodule and reference it with a new version
if (!(await isSameSchema(schemaSourceFilePath, latestSchemaPath))) {
    const versions = await readSchemaVersions();

    // 1. freeze the current latest before it gets overwritten
    const latestVersion = versions.at(-1);
    if (latestVersion) {
        await freezeLatestSchema(latestVersion);
    }

    // 2. frozen versions
    for (const version of versions) {
        await regenerateSchemaVersion(version);
    }

    // 3. latest
    await writeSchemaVersion(LATEST, schemaSourceFilePath);

    // 4. reference the new latest
    await appendSchemaVersion(getNextSchemaVersion(versions, new Date()));
}
