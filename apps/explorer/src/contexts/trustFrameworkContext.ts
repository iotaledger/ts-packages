// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import type { IdentityClientReadOnly } from '@iota/identity-wasm/web';
import type { NotarizationClientReadOnly } from '@iota/notarization/web';
import type { AuditTrailClientReadOnly } from '@iota/audit-trails/web';
import { createContext, useContext } from 'react';
import type { QueryStatus } from '@tanstack/react-query';

type IdentityClient = IdentityClientReadOnly | null;
type NotarizationClient = NotarizationClientReadOnly | null;
type AuditTrailClient = AuditTrailClientReadOnly | null;

export interface TrustFrameworkProviderContext {
    identityClient: IdentityClient;
    identityClientStatus: QueryStatus;
    notarizationClient: NotarizationClient;
    notarizationClientStatus: QueryStatus;
    auditTrailClient: AuditTrailClient;
    auditTrailClientStatus: QueryStatus;
}

export const TrustFrameworkContext = createContext<TrustFrameworkProviderContext | null>(null);

export function useTrustFramework(): TrustFrameworkProviderContext {
    const context = useContext(TrustFrameworkContext);

    if (!context) {
        throw new Error('useTrustFramework must be used within a TrustFrameworkProvider');
    }

    return context;
}

export function useIdentityClient(): { client: IdentityClient; status: QueryStatus } {
    const { identityClient, identityClientStatus } = useTrustFramework();
    return { client: identityClient, status: identityClientStatus };
}

export function useNotarizationClient(): {
    client: NotarizationClient;
    status: QueryStatus;
} {
    const { notarizationClient, notarizationClientStatus } = useTrustFramework();
    return {
        client: notarizationClient,
        status: notarizationClientStatus,
    };
}

export function useAuditTrailClient(): { client: AuditTrailClient; status: QueryStatus } {
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
