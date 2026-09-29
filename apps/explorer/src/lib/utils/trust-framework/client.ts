// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import * as identity from '@iota/identity-wasm/web';
import identityWasmUrl from '@iota/identity-wasm/web/identity_wasm_bg.wasm?url';
import * as notarization from '@iota/notarization/web';
import notarizationWasmUrl from '@iota/notarization/web/notarization_wasm_bg.wasm?url';
import * as auditTrail from '@iota/audit-trails/web';
import auditTrailWasmUrl from '@iota/audit-trails/web/audit_trail_wasm_bg.wasm?url';
import { type IotaClient, Network } from '@iota/iota-sdk/client';
import {
    DID_PROTOCOL_SEGMENT_SYMBOL,
    DID_URL_SEGMENT_SYMBOL,
    IOTA_IDENTITY_PKG_ID,
    IOTA_NOTARIZATION_PKG_ID,
    IOTA_AUDIT_TRAIL_PKG_ID,
    IOTA_TF_COMPONENTS_PKG_ID,
} from '~/lib/constants/trustFramework.constants';

const regularNetworks = new Set([Network.Mainnet, Network.Testnet, Network.Devnet]);
let initIdentityPromise: Promise<void> | null = null;
let initNotarizationPromise: Promise<void> | null = null;
let initAuditTrailPromise: Promise<void> | null = null;

export const initIdentityWasmWeb = async (): Promise<void> => {
    if (!initIdentityPromise) {
        initIdentityPromise = identity.init(identityWasmUrl).catch((e) => {
            console.error('failed to load identity wasm (web version)', e);
            initIdentityPromise = null; // allow retry
            throw e;
        });
    }
    return initIdentityPromise;
};

export const initNotarizationWasmWeb = async (): Promise<void> => {
    if (!initNotarizationPromise) {
        initNotarizationPromise = notarization.init(notarizationWasmUrl).catch((e) => {
            console.error('failed to load notarization wasm (web version)', e);
            initNotarizationPromise = null; // allow retry
            throw e;
        });
    }
    return initNotarizationPromise;
};

export const initAuditTrailWasmWeb = async (): Promise<void> => {
    if (!initAuditTrailPromise) {
        initAuditTrailPromise = auditTrail.init(auditTrailWasmUrl).catch((e) => {
            console.error('failed to load audit trail wasm (web version)', e);
            initAuditTrailPromise = null; // allow retry
            throw e;
        });
    }
    return initAuditTrailPromise;
};

export const createIdentityClientReadOnly = async (
    iotaClient: IotaClient,
    network: string,
): Promise<identity.IdentityClientReadOnly> => {
    await initIdentityWasmWeb();
    if (IOTA_IDENTITY_PKG_ID != null) {
        return await identity.IdentityClientReadOnly.createWithPkgId(
            iotaClient,
            IOTA_IDENTITY_PKG_ID,
        );
    }

    if (regularNetworks.has(network as Network)) {
        return await identity.IdentityClientReadOnly.create(iotaClient);
    }

    throw new Error(
        'Failed to create an IdentityClientReadOnly; declare IOTA_IDENTITY_PKG_ID environment if running on a custom network.',
    );
};

export const createNotarizationClientReadOnly = async (
    iotaClient: IotaClient,
    network: string,
): Promise<notarization.NotarizationClientReadOnly> => {
    await initNotarizationWasmWeb();
    if (IOTA_NOTARIZATION_PKG_ID != null) {
        return await notarization.NotarizationClientReadOnly.createWithPkgId(
            iotaClient,
            IOTA_NOTARIZATION_PKG_ID,
        );
    }

    if (regularNetworks.has(network as Network)) {
        return await notarization.NotarizationClientReadOnly.create(iotaClient);
    }

    throw new Error(
        'Failed to create a NotarizationClientReadOnly; declare IOTA_NOTARIZATION_PKG_ID environment if running on a custom network.',
    );
};

export const createAuditTrailClientReadOnly = async (
    iotaClient: IotaClient,
    network: string,
): Promise<auditTrail.AuditTrailClientReadOnly> => {
    await initAuditTrailWasmWeb();

    const isKnownNetwork = regularNetworks.has(network as Network);
    const hasOverrides = !!IOTA_AUDIT_TRAIL_PKG_ID || !!IOTA_TF_COMPONENTS_PKG_ID;

    if (!isKnownNetwork && !hasOverrides) {
        throw new Error(
            'Failed to create a AuditTrailClientReadOnly. Declare IOTA_AUDIT_TRAIL_PKG_ID and IOTA_TF_COMPONENTS_PKG_ID environment variables if running on a custom network.',
        );
    }

    if (hasOverrides) {
        return await auditTrail.AuditTrailClientReadOnly.createWithPackageOverrides(
            iotaClient,
            new auditTrail.PackageOverrides(IOTA_AUDIT_TRAIL_PKG_ID, IOTA_TF_COMPONENTS_PKG_ID),
        );
    }

    return await auditTrail.AuditTrailClientReadOnly.create(iotaClient);
};

export async function tryDIDParse(didCandidate: string): Promise<identity.IotaDID | null> {
    try {
        await initIdentityWasmWeb();
        return identity.IotaDID.parse(didCandidate);
    } catch {
        return null;
    }
}

export async function tryEncodeDidToUrl(did: identity.IotaDID | string): Promise<string | null> {
    try {
        await initIdentityWasmWeb();
        const isStr = typeof did === 'string';
        const didStr = isStr ? did : did.toString();
        const encodedDid = didStr.replaceAll(DID_PROTOCOL_SEGMENT_SYMBOL, DID_URL_SEGMENT_SYMBOL);
        return encodedDid;
    } catch {
        return null;
    }
}

export async function tryDecodeDidFromUrl(encodedDid: string): Promise<identity.IotaDID | null> {
    try {
        await initIdentityWasmWeb();
        const didStr = encodedDid.replaceAll(DID_URL_SEGMENT_SYMBOL, DID_PROTOCOL_SEGMENT_SYMBOL);
        const did = identity.IotaDID.parse(didStr);
        return did;
    } catch {
        return null;
    }
}
