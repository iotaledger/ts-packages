// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

// TODO: use '@iota/audit-trail/web' after publish
import { type AuditTrailHandle, type OnChainAuditTrail } from '@iota/audit-trail';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useAuditTrailClient } from '~/contexts';

/**
 * A React hook that resolves an Object ID to its corresponding Audit Trail document on chain.
 *
 * @param {string} objectId - The Object ID to resolve.
 * @returns a Audit Trail document on chain.
 */
export function useResolveOnChainAuditTrail(objectId: string): UseQueryResult<OnChainAuditTrail> {
    const auditTrailClient = useAuditTrailClient();
    return useQuery({
        queryKey: ['resolve-audit-trail', objectId],
        queryFn: async () => auditTrailClient?.trail(objectId).get(),
        enabled: !!auditTrailClient,
    });
}

/**
 * A React hook that resolves an Object ID to its corresponding Audit Trail document on chain.
 *
 * @param {string} objectId - The Object ID to resolve.
 * @returns a Audit Trail document on chain.
 */
export function useResolveAuditTrailHandle(objectId: string): UseQueryResult<AuditTrailHandle> {
    const auditTrailClient = useAuditTrailClient();
    return useQuery({
        queryKey: ['resolve-audit-trail', objectId],
        queryFn: async () => auditTrailClient?.trail(objectId),
        enabled: !!auditTrailClient,
    });
}
