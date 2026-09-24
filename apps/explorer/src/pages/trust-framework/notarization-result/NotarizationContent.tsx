// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType } from '@iota/apps-ui-kit';
import { AddressAlias, useCopyToClipboard, useGetObjectOrPastObject } from '@iota/core';
import {
    ErrorBoundary,
    PageHeader,
    PageLayout,
    PagePanel,
    SyntaxHighlighter,
    TransactionBlocksForAddress,
} from '~/components';
import { getHistoryUnavailableMessage, onCopySuccess, replaceJsonKeyValue } from '~/lib';
import { useNotarizationClient, useNotarizationPkgId } from '~/contexts';
import { Warning } from '@iota/apps-ui-icons';
import { useResolveNotarization } from '~/hooks/useResolveNotarization';
import { NotarizationSummaryView } from './views/NotarizationSummaryView';
import { LockLifecycleView } from './views/LockLifecycleView';
import { toNotarizationLocks } from './lockEntries';
import { OwnersView } from './views/OwnersView';
import { StateView } from './views/StateView';

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
                    <PagePanel
                        title="Lock Lifecycle"
                        tooltip="View the lock lifecycle governing transfer, update, and delete operations on this notarization."
                    >
                        <LockLifecycleView
                            locks={toNotarizationLocks(
                                notarizationDocument.immutableMetadata.locking,
                            )}
                        />
                    </PagePanel>
                    <PagePanel
                        title="Owners History"
                        tooltip="The history of addresses that have owned this notarization object, ordered from most recent to oldest."
                    >
                        <OwnersView objectId={objectId} />
                    </PagePanel>
                    {notarizationDocument.state && (
                        <PagePanel
                            title="Notarization State"
                            tooltip="The state data of this Notarization and its metadata. The data is displayed as text if valid UTF-8, otherwise as Base64."
                        >
                            <StateView notarization={notarizationDocument} />
                        </PagePanel>
                    )}
                    <PagePanel
                        title="Notarization"
                        tooltip="The raw JSON representation of the On-Chain Notarization. This includes the state, metadata, and other properties of the notarization."
                    >
                        <SyntaxHighlighter
                            code={JSON.stringify(
                                notarizationDocument.toJSON(),
                                replaceJsonKeyValue,
                                2,
                            )}
                            language="json"
                        />
                    </PagePanel>
                    <ErrorBoundary>
                        <TransactionBlocksForAddress
                            address={objectId}
                            header="Transaction Blocks"
                        />
                    </ErrorBoundary>
                </div>
            }
        />
    );
}
