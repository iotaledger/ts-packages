// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { useIotaClient, useIotaClientContext } from '@iota/dapp-kit';
import { Feature } from '@iota/core';
import { useFeatureIsOn } from '@iota/apps-backend-client';
import { type AuditTrailClientReadOnly } from '@iota/audit-trails/web';
import { type IdentityClientReadOnly } from '@iota/identity-wasm/web';
import { type NotarizationClientReadOnly } from '@iota/notarization/web';
import { type PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { TrustFrameworkContext, type TrustFrameworkProviderContext } from '~/contexts';
import {
    createAuditTrailClientReadOnly,
    createIdentityClientReadOnly,
    createNotarizationClientReadOnly,
} from '~/lib/utils/trust-framework/client';

export function TrustFrameworkProvider({ children }: PropsWithChildren) {
    const { network } = useIotaClientContext();
    const iotaClient = useIotaClient();
    const isAuditTrailEnabled = useFeatureIsOn(Feature.ExplorerTFAuditTrail as string);
    const [identityClient, setIdentityClient] = useState<IdentityClientReadOnly | null>(null);
    const [notarizationClient, setNotarizationClient] = useState<NotarizationClientReadOnly | null>(
        null,
    );
    const [auditTrailClient, setAuditTrailClient] = useState<AuditTrailClientReadOnly | null>(null);

    useEffect(() => {
        if (!iotaClient) return;

        const instantiateIdentityClient = async () => {
            const _identityClient = await createIdentityClientReadOnly(iotaClient, network);
            setIdentityClient(_identityClient);
        };
        instantiateIdentityClient();

        const instantiateNotarizationClient = async () => {
            const _notarizationClient = await createNotarizationClientReadOnly(iotaClient, network);
            setNotarizationClient(_notarizationClient);
        };
        instantiateNotarizationClient();
    }, [iotaClient, network]);

    useEffect(() => {
        if (!iotaClient || !isAuditTrailEnabled) return;

        const instantiateAuditTrailClient = async () => {
            const _auditTrailClient = await createAuditTrailClientReadOnly(iotaClient, network);
            setAuditTrailClient(_auditTrailClient);
        };
        instantiateAuditTrailClient();
    }, [iotaClient, network, isAuditTrailEnabled]);

    const ctx = useMemo(
        (): TrustFrameworkProviderContext => ({
            identityClient,
            notarizationClient,
            auditTrailClient,
        }),
        [identityClient, notarizationClient, auditTrailClient],
    );

    return <TrustFrameworkContext.Provider value={ctx}>{children}</TrustFrameworkContext.Provider>;
}
