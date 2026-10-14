// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

function parseVersion(version: string): number[] | null {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(version);
    if (!match) return null;
    const [, major, minor, patch, rc] = match;
    return [Number(major), Number(minor), Number(patch), rc === undefined ? Infinity : Number(rc)];
}
/**
 * Whether the version is at least `x.y.z.(n)`.
 *
 * A version `x.y.z.n` includes itself and `x.y.z`
 * but a `x.y.z` version doesn't include `x.y.z.n`.
 */
export function isVersionAtLeast(version: string, minVersion: string): boolean {
    const current = parseVersion(version);
    const min = parseVersion(minVersion);
    if (!current || !min) return false;
    for (let i = 0; i < current.length; i++) {
        if (current[i] !== min[i]) return current[i] > min[i];
    }
    return true;
}
