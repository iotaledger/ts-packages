// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { useIotaClient, useIotaClientContext } from '@iota/dapp-kit';
import { Feature } from '@iota/core';
import { useFeatureIsOn } from '@iota/apps-backend-client';
import { type PropsWithChildren, useCallback, useState } from 'react';
import { TrustFrameworkContext, type TrustFrameworkClientKind } from '~/contexts';
import {
    createAuditTrailClientReadOnly,
    createIdentityClientReadOnly,
    createNotarizationClientReadOnly,
} from '~/lib/utils/trust-framework/client';
import { useQuery } from '@tanstack/react-query';

export function TrustFrameworkProvider({ children }: PropsWithChildren) {
    const { network } = useIotaClientContext();
    const iotaClient = useIotaClient();
    const isAuditTrailEnabled = useFeatureIsOn(Feature.ExplorerTFAuditTrail as string);
    const [requested, setRequested] = useState<Record<TrustFrameworkClientKind, boolean>>({
        identity: false,
        notarization: false,
        auditTrail: false,
    });

    const requestClient = useCallback((kind: TrustFrameworkClientKind) => {
        setRequested((prev) => (prev[kind] ? prev : { ...prev, [kind]: true }));
    }, []);

    const identityClientQuery = useQuery({
        // eslint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['identity-client', network],
        queryFn: () => createIdentityClientReadOnly(iotaClient, network),
        enabled: !!iotaClient && requested.identity,
        retry: false,
    });

    const notarizationClientQuery = useQuery({
        // eslint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['notarization-client', network],
        queryFn: () => createNotarizationClientReadOnly(iotaClient, network),
        enabled: !!iotaClient && requested.notarization,
        retry: false,
    });

    const auditTrailClientQuery = useQuery({
        // eslint-disable-next-line @tanstack/query/exhaustive-deps
        queryKey: ['audit-trail-client', network],
        queryFn: () => createAuditTrailClientReadOnly(iotaClient, network),
        enabled: !!iotaClient && isAuditTrailEnabled && requested.auditTrail,
        retry: false,
    });

    return (
        <TrustFrameworkContext.Provider
            value={{
                identityClient: identityClientQuery.data ?? null,
                identityClientStatus: identityClientQuery.status,
                notarizationClient: notarizationClientQuery.data ?? null,
                notarizationClientStatus: notarizationClientQuery.status,
                auditTrailClient: auditTrailClientQuery.data ?? null,
                auditTrailClientStatus: auditTrailClientQuery.status,
                requestClient,
            }}
        >
            {children}
        </TrustFrameworkContext.Provider>
    );
}
