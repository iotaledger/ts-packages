// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType } from '@iota/apps-ui-kit';
import { AddressAlias, useCopyToClipboard, useGetObjectOrPastObject } from '@iota/core';
import { PageHeader, PageLayout } from '~/components';
import { onCopySuccess } from '~/lib';
import { useAuditTrailPkgId } from '~/contexts';
import { useMemo } from 'react';
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
import { LockLifecycleView } from './views/lock-lifecycle/LockLifecycleView';
import { RolesView } from './views/roles/RolesView';
import { TagsView } from './views/TagsView';
import { RecordsView } from './views/RecordsView';
import { SideBySidePanels } from '~/components/ui/SideBySidePanels';

interface AuditTrailContentProps {
    objectId: string;
}

export function AuditTrailContent({ objectId }: AuditTrailContentProps) {
    const { data: objectResult, isPending: isObjectPending } = useGetObjectOrPastObject(objectId);
    const { data: auditTrailObject, isPending: isAuditTrailObjectPending } =
        useResolveOnChainAuditTrail(objectId);
    const { data: auditTrailHandle, isPending: isAuditTrailHandlePending } =
        useResolveAuditTrailHandle(objectId);

    const copyToClipboard = useCopyToClipboard(onCopySuccess);
    const iotaAuditTrailPackage = useAuditTrailPkgId();

    const isPending = useMemo(
        () => isAuditTrailObjectPending || isObjectPending || isAuditTrailHandlePending,
        [isAuditTrailObjectPending, isObjectPending, isAuditTrailHandlePending],
    );
    if (isPending) {
        return <PageLayout loading loadingText="Loading Audit Trail Object..." content={[]} />;
    }

    if (auditTrailObject == null || auditTrailHandle == null) {
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

    if (objectResult == null) {
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

    if (iotaAuditTrailPackage == null) {
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
                        firstPanel={
                            <LockLifecycleView lockingConfig={auditTrailObject.lockingConfig} />
                        }
                        secondPanel={<MetadataView auditTrail={auditTrailObject} />}
                    />
                    <RecordsView objectId={objectId} auditTrail={auditTrailHandle} />
                    <SideBySidePanels
                        ratio="66-34"
                        firstPanel={<RolesView roles={auditTrailObject.roles.roles} />}
                        secondPanel={<TagsView tags={auditTrailObject.tags} />}
                    />
                    <TransactionsView objectId={objectId} />
                </div>
            }
        />
    );
}
