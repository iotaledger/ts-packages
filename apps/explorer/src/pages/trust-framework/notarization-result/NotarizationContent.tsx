// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType } from '@iota/apps-ui-kit';
import { AddressAlias, useCopyToClipboard, useGetObjectOrPastObject } from '@iota/core';
import { PageHeader, PageLayout } from '~/components';
import { getHistoryUnavailableMessage, onCopySuccess } from '~/lib';
import { useNotarizationClient, useNotarizationPkgId } from '~/contexts';
import { Warning } from '@iota/apps-ui-icons';
import { useResolveNotarization } from '~/hooks/useResolveNotarization';
import { NotarizationSummaryView } from './views/NotarizationSummaryView';
import { LockLifecycleView } from './views/LockLifecycleView';
import { toNotarizationLocks } from './lockEntries';
import { OwnersView } from './views/OwnersView';
import { SideBySidePanels } from '~/components/ui/SideBySidePanels';
import { TransactionsView } from '../common/TransactionsView';
import { StateView } from './views/StateView';
import { NotarizationJsonView } from './views/NotarizationJsonView';

interface NotarizationContentProps {
    objectId: string;
}

export function NotarizationContent({ objectId }: NotarizationContentProps) {
    const { data: objectResult, isLoading: isObjectLoading } = useGetObjectOrPastObject(objectId);
    const { data: notarizationDocument, isLoading: isNotarizationLoading } =
        useResolveNotarization(objectId);
    const { status: notarizationClientStatus } = useNotarizationClient();

    const copyToClipboard = useCopyToClipboard(onCopySuccess);
    const iotaNotarizationPackage = useNotarizationPkgId();

    const isLoading = Boolean(
        isNotarizationLoading || isObjectLoading || notarizationClientStatus === 'pending',
    );

    if (isLoading) {
        return (
            <PageLayout
                loading
                loadingText="Loading Notarization Document and Object..."
                content={[]}
            />
        );
    }

    if (objectResult?.isHistoryUnavailable) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Notarization No Longer Available"
                        supportingText={getHistoryUnavailableMessage(`Notarization ${objectId}`)}
                        icon={<Warning />}
                        type={InfoBoxType.Warning}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    if (!notarizationDocument) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Error resolving Notarization Document"
                        supportingText={`Could not resolve Notarization ${objectId} in the current network.`}
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    if (!objectResult || !objectResult.data) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Error fetching Notarization Object"
                        supportingText={`Could not fetch Object ID ${objectId} from the current network.`}
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    if (!iotaNotarizationPackage) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Error loading official Notarization package"
                        supportingText="Could not load package ID from Notarization client."
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
                        type="Notarization"
                        title={
                            <AddressAlias
                                address={objectId || ''}
                                onCopy={() => copyToClipboard(objectId || '')}
                            />
                        }
                        showCopyButton={false}
                    />
                    <NotarizationSummaryView
                        objectData={objectResult.data!}
                        notarizationDocument={notarizationDocument}
                    />
                    <SideBySidePanels
                        firstPanel={
                            <LockLifecycleView
                                locks={toNotarizationLocks(
                                    notarizationDocument.immutableMetadata.locking,
                                )}
                            />
                        }
                        secondPanel={<OwnersView objectId={objectId} />}
                    />
                    <StateView notarization={notarizationDocument} />
                    <NotarizationJsonView notarization={notarizationDocument} />
                    <TransactionsView objectId={objectId} />
                </div>
            }
        />
    );
}
