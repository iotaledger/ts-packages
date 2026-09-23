// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType } from '@iota/apps-ui-kit';
import { AddressAlias, useCopyToClipboard, useGetObjectOrPastObject } from '@iota/core';
import type { IotaDID } from '@iota/identity-wasm/web';
import {
    ErrorBoundary,
    PageHeader,
    PageLayout,
    PagePanel,
    TransactionBlocksForAddress,
} from '~/components';
import { useResolveDid } from '~/hooks/useResolveDid';
import { getHistoryUnavailableMessage, onCopySuccess } from '~/lib';
import { useIdentityPkgId } from '~/contexts';
import { Warning } from '@iota/apps-ui-icons';
import { ControllerView } from './views/ControllerView';
import { ServiceView } from './views/ServiceView';
import { IdentitySummaryView } from './views/IdentitySummaryView';
import { extractDidDoc } from './helper';
import { IdentityDocumentJsonView } from './views/IdentityDocumentJsonView';

interface IdentityContentProps {
    did: IotaDID;
}

export function IdentityContent({ did }: IdentityContentProps) {
    const { data: didDocument, isPending: isDidDocumentPending } = useResolveDid(did);
    const { data: objectResult, isPending: isObjectPending } = useGetObjectOrPastObject(did.tag());
    const didObject = objectResult?.data ?? null;
    const didDocFromObject = (didObject && extractDidDoc(didObject)) ?? null;

    const copyToClipboard = useCopyToClipboard(onCopySuccess);
    const iotaIdentityPackage = useIdentityPkgId();

    const isPending = isDidDocumentPending || isObjectPending;
    if (isPending) {
        return <PageLayout loading loadingText="Loading DID Document and Object..." content={[]} />;
    }

    if (objectResult?.isHistoryUnavailable) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="DID No Longer Available"
                        supportingText={getHistoryUnavailableMessage(`DID Object ${did.tag()}`)}
                        icon={<Warning />}
                        type={InfoBoxType.Warning}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    if (!didDocument) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Error resolving DID Document"
                        supportingText={`Could not resolve the DID ${did.toString()} in the current network.`}
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    if (!didObject) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Error fetching DID Object"
                        supportingText={`Could not fetch DID Object ${did.tag()} from the current network.`}
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    if (!didDocFromObject) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Deleted DID"
                        supportingText={`Deleted DID Object ${did.tag()} from the current network.`}
                        icon={<Warning />}
                        type={InfoBoxType.Error}
                        style={InfoBoxStyle.Elevated}
                    />
                }
            />
        );
    }

    if (!iotaIdentityPackage) {
        return (
            <PageLayout
                content={
                    <InfoBox
                        title="Error loading official Identity package"
                        supportingText="Could not load package ID from Identity client."
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
                        type="Identity"
                        title={
                            <AddressAlias
                                address={did.toString() || ''}
                                onCopy={() => copyToClipboard(did.toString() || '')}
                            />
                        }
                        showCopyButton={false}
                    />
                    <IdentitySummaryView objectData={didObject} didDocument={didDocument} />
                    <PagePanel
                        title="Controller"
                        tooltip="The entity or entities authorized to modify this Identity. An Identity can have multiple controllers with shared authority"
                    >
                        <ControllerView objectData={didObject} />
                    </PagePanel>
                    <PagePanel
                        title="Domain Linkage"
                        tooltip="A verified, bidirectional connection between this Identity and a web domain. Proves that the Identity controller owns the linked domain."
                    >
                        <ServiceView didDocument={didDocument} />
                    </PagePanel>
                    <IdentityDocumentJsonView didDocument={didDocument} />
                    <ErrorBoundary>
                        <TransactionBlocksForAddress
                            address={did.tag()}
                            header="Transaction Blocks"
                        />
                    </ErrorBoundary>
                </div>
            }
        />
    );
}
