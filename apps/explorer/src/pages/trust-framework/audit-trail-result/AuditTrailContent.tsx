// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType } from '@iota/apps-ui-kit';
import { AddressAlias, useCopyToClipboard, useGetObjectOrPastObject } from '@iota/core';
import { PageHeader, PageLayout } from '~/components';
import { onCopySuccess } from '~/lib';
import { useAuditTrailClient, useAuditTrailPkgId } from '~/contexts';
import { Warning } from '@iota/apps-ui-icons';
import {
    useResolveAuditTrailHandle,
    useResolveOnChainAuditTrail,
} from '~/hooks/useResolveAuditTrail';
import { TransactionsView } from '../common/TransactionsView';
import { AuditTrailSummaryView } from './views/AuditTrailSummaryView';
import { MetadataView } from './views/MetadataView';
import { TagsView } from './views/TagsView';
import { RecordsView } from './views/RecordsView';
import { RolesView } from './views/RolesView';
import { SideBySidePanels } from '~/components/ui/SideBySidePanels';
import { LockLifecycleView } from '../notarization-result/views/LockLifecycleView';
import { toAuditTrailLocks } from './lockEntries';

interface AuditTrailContentProps {
    objectId: string;
}

export function AuditTrailContent({ objectId }: AuditTrailContentProps) {
    const { status: auditTrailClientStatus } = useAuditTrailClient();
    const { data: objectResult, isLoading: isObjectLoading } = useGetObjectOrPastObject(objectId);
    const { data: auditTrailObject, isLoading: isAuditTrailObjectLoading } =
        useResolveOnChainAuditTrail(objectId);
    const { data: auditTrailHandle, isLoading: isAuditTrailHandleLoading } =
        useResolveAuditTrailHandle(objectId);

    const isLoading = Boolean(
        isAuditTrailObjectLoading ||
            isObjectLoading ||
            isAuditTrailHandleLoading ||
            auditTrailClientStatus === 'pending',
    );

    const copyToClipboard = useCopyToClipboard(onCopySuccess);
    const iotaAuditTrailPackage = useAuditTrailPkgId();

    if (isLoading) {
        return <PageLayout loading loadingText="Loading Audit Trail Object..." content={[]} />;
    }

    if (!auditTrailObject || !auditTrailHandle) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Error resolving Audit Trail"
                        supportingText={`Could not resolve Audit Trail ${objectId} in the current network.`}
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    if (!objectResult) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Error fetching Object"
                        supportingText={`Could not fetch Object ID ${objectId} from the current network.`}
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    if (!iotaAuditTrailPackage) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Error loading official Audit Trail package"
                        supportingText="Could not load package ID from Audit Trail client."
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    return (
        <PageLayout
            content={
                <div className="flex flex-col gap-y-2xl">
                    <PageHeader
                        type="Audit Trail"
                        title={
                            <AddressAlias
                                address={objectId || ''}
                                onCopy={() => copyToClipboard(objectId || '')}
                            />
                        }
                        showCopyButton={false}
                    />
                    <AuditTrailSummaryView
                        auditTrailObject={auditTrailObject}
                        objectData={objectResult.data!}
                    />
                    <SideBySidePanels
                        firstPanel={
                            <LockLifecycleView
                                locks={toAuditTrailLocks(auditTrailObject.lockingConfig)}
                            />
                        }
                        secondPanel={<MetadataView auditTrail={auditTrailObject} />}
                    />
                    <RecordsView objectId={objectId} auditTrail={auditTrailHandle} />
                    <SideBySidePanels
                        ratio="66-34"
                        firstPanel={<RolesView roles={auditTrailObject.roles} />}
                        secondPanel={<TagsView tags={auditTrailObject.tags} />}
                    />
                    <TransactionsView objectId={objectId} />
                </div>
            }
        />
    );
}
