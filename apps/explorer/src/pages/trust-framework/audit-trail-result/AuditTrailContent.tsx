// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType } from '@iota/apps-ui-kit';
import { AddressAlias, useCopyToClipboard, useGetObjectOrPastObject } from '@iota/core';
import { PageHeader, PageLayout } from '~/components';
import { onCopySuccess } from '~/lib';
import { useAuditTrailPkgId } from '~/contexts';
import { Warning } from '@iota/apps-ui-icons';
import {
    getAuditTrailRecordsSize,
    getAuditTrailType,
    MetadataBuilder,
} from '../headerMetadataHelper';
import {
    useResolveAuditTrailHandle,
    useResolveOnChainAuditTrail,
} from '~/hooks/useResolveAuditTrail';
import { TransactionsView } from '../common/TransactionsView';
import { AuditTrailSummaryView } from './views/AuditTrailSummaryView';
import { MetadataView } from './views/MetadataView';
import { TagsView } from './views/TagsView';
import { RecordsView } from './views/RecordsView';
import { SideBySidePanels } from '~/components/ui/SideBySidePanels';

interface AuditTrailContentProps {
    objectId: string;
}

export function AuditTrailContent({ objectId }: AuditTrailContentProps) {
    const { data: objectResult, isLoading: isObjectLoading } = useGetObjectOrPastObject(objectId);
    const { data: auditTrailObject, isLoading: isAuditTrailObjectLoading } =
        useResolveOnChainAuditTrail(objectId);
    const { data: auditTrailHandle, isLoading: isAuditTrailHandleLoading } =
        useResolveAuditTrailHandle(objectId);

    const copyToClipboard = useCopyToClipboard(onCopySuccess);
    const iotaAuditTrailPackage = useAuditTrailPkgId();

    if (isAuditTrailObjectLoading || isObjectLoading || isAuditTrailHandleLoading) {
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
        // The activation of this branch is a symptom of Notarization WASM Web module not loaded.
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
                        metaItems={MetadataBuilder.create()
                            .addItem(getAuditTrailType(objectResult.data!, iotaAuditTrailPackage))
                            .addItem(getAuditTrailRecordsSize(auditTrailObject))
                            .build()}
                    />
                    <AuditTrailSummaryView
                        auditTrailObject={auditTrailObject}
                        objectData={objectResult.data!}
                    />
                    <SideBySidePanels
                        firstPanel={<p>Replace with LockLifecycleView</p>}
                        secondPanel={<MetadataView auditTrail={auditTrailObject} />}
                    />
                    <RecordsView objectId={objectId} auditTrail={auditTrailHandle} />
                    <SideBySidePanels
                        ratio="66-34"
                        firstPanel={<p>Replace with RolesView</p>}
                        secondPanel={<TagsView tags={auditTrailObject.tags} />}
                    />
                    <TransactionsView objectId={objectId} />
                </div>
            }
        />
    );
}
