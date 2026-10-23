// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import type { IdentityClientReadOnly } from '@iota/identity-wasm/web';
import type { NotarizationClientReadOnly } from '@iota/notarization/web';
import type { AuditTrailClientReadOnly } from '@iota/audit-trails/web';
import { createContext, useContext, useEffect } from 'react';
import type { QueryStatus } from '@tanstack/react-query';

type IdentityClient = IdentityClientReadOnly | null;
type NotarizationClient = NotarizationClientReadOnly | null;
type AuditTrailClient = AuditTrailClientReadOnly | null;

export type TrustFrameworkClientKind = 'identity' | 'notarization' | 'auditTrail';

export interface TrustFrameworkProviderContext {
    identityClient: IdentityClient;
    identityClientStatus: QueryStatus;
    notarizationClient: NotarizationClient;
    notarizationClientStatus: QueryStatus;
    auditTrailClient: AuditTrailClient;
    auditTrailClientStatus: QueryStatus;
    requestClient: (kind: TrustFrameworkClientKind) => void;
}

export const TrustFrameworkContext = createContext<TrustFrameworkProviderContext | null>(null);

export function useTrustFramework(): TrustFrameworkProviderContext {
    const context = useContext(TrustFrameworkContext);

    if (!context) {
        throw new Error('useTrustFramework must be used within a TrustFrameworkProvider');
    }

    return context;
}

function useRequestClient(kind: TrustFrameworkClientKind, enabled: boolean): void {
    const { requestClient } = useTrustFramework();
    useEffect(() => {
        if (enabled) requestClient(kind);
    }, [kind, enabled, requestClient]);
}

export function useIdentityClient(enabled = true): { client: IdentityClient; status: QueryStatus } {
    useRequestClient('identity', enabled);
    const { identityClient, identityClientStatus } = useTrustFramework();
    return { client: identityClient, status: identityClientStatus };
}

export function useNotarizationClient(enabled = true): {
    client: NotarizationClient;
    status: QueryStatus;
} {
    useRequestClient('notarization', enabled);
    const { notarizationClient, notarizationClientStatus } = useTrustFramework();
    return {
        client: notarizationClient,
        status: notarizationClientStatus,
    };
}

export function useAuditTrailClient(enabled = true): {
    client: AuditTrailClient;
    status: QueryStatus;
} {
    useRequestClient('auditTrail', enabled);
    const { auditTrailClient, auditTrailClientStatus } = useTrustFramework();
    return { client: auditTrailClient, status: auditTrailClientStatus };
}

export function useIdentityPkgId(): string | null {
    return useIdentityClient().client?.packageId() || null;
}

export function useNotarizationPkgId(): string | null {
    return useNotarizationClient().client?.packageId() || null;
}

export function useAuditTrailPkgId(): string | null {
    return useAuditTrailClient().client?.packageId() || null;
}
