// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { DisplayStats, TooltipPosition } from '@iota/apps-ui-kit';
import { useFormatCoin } from '@iota/core';
import { type IotaObjectData } from '@iota/iota-sdk/client';
import { CoinFormat, formatDigest, parseStructTag } from '@iota/iota-sdk/utils';
import { ObjectLink, TransactionLink } from '~/components/ui';
import { onCopySuccess } from '~/lib/utils';
import { DateDisplay, ErrorBoundary } from '~/components';
import { type OnChainNotarization } from '@iota/notarization/web';
import { getNotarizationMethod, getNotarizationType } from '../../headerMetadataHelper';
import { useNotarizationPkgId } from '~/contexts';

interface NotarizationSummaryViewProps {
    notarizationDocument: OnChainNotarization;
    objectData: IotaObjectData;
}

export function NotarizationSummaryView({
    notarizationDocument,
    objectData,
}: NotarizationSummaryViewProps): JSX.Element {
    const objectId = objectData.objectId;
    const storageRebate = objectData.storageRebate;
    const versionCount = `v${notarizationDocument.stateVersionCount}`;

    const createdAt = Number(notarizationDocument.immutableMetadata.createdAt);
    const updatedAt = Number(notarizationDocument.lastStateChangeAt);
    const lastTransactionBlockDigest = objectData.previousTransaction;
    const iotaNotarizationPackage = useNotarizationPkgId();

    const notarizationType = iotaNotarizationPackage
        ? getNotarizationType(objectData, iotaNotarizationPackage)
        : undefined;
    const notarizationMethod = getNotarizationMethod(notarizationDocument);

    return (
        <ErrorBoundary>
            <div className="flex flex-col gap-md">
                <div className="grid grid-cols-2 gap-sm">
                    {notarizationType && (
                        <NotarizationTypeCard notarizationType={notarizationType} />
                    )}
                    <DisplayStats
                        label={notarizationMethod.label}
                        value={notarizationMethod.value}
                        tooltipPosition={TooltipPosition.Top}
                        tooltipText="Locked notarizations keep their state forever. Dynamic notarizations can be updated by their owner."
                    />
                </div>
                <div className="grid grid-cols-2 gap-sm md:grid-cols-3">
                    {objectId && <ObjectIdCard objectId={objectId} />}
                    {versionCount && (
                        <DisplayStats
                            label="Version"
                            value={versionCount}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="Version of state change in a progressive sequence."
                        />
                    )}
                    {storageRebate && <StorageRebateCard storageRebate={storageRebate} />}
                    {createdAt > 0 && (
                        <DisplayStats
                            label="Created at"
                            value={<DateDisplay timestamp={createdAt} />}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="Timestamp of the transaction that first published this notarization onchain."
                        />
                    )}
                    {updatedAt > 0 && (
                        <DisplayStats
                            label="Updated at"
                            value={<DateDisplay timestamp={updatedAt} />}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="Timestamp of the most recent transaction that modified this notarization. The version badge shows the current state version count."
                        />
                    )}
                    {lastTransactionBlockDigest && (
                        <LastTxBlockCard digest={lastTransactionBlockDigest} />
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
}

interface NotarizationTypeCardProps {
    notarizationType: NonNullable<ReturnType<typeof getNotarizationType>>;
}

function NotarizationTypeCard({ notarizationType }: NotarizationTypeCardProps): JSX.Element {
    const { address, module } = parseStructTag(notarizationType.structTag);

    return (
        <DisplayStats
            label={notarizationType.label}
            value={
                <ObjectLink objectId={`${address}?module=${module}`} label={notarizationType.value}>
                    {notarizationType.value}
                </ObjectLink>
            }
            copyText={notarizationType.structTag}
            onCopySuccess={onCopySuccess}
            tooltipPosition={TooltipPosition.Top}
            tooltipText={notarizationType.tooltipText}
        />
    );
}

interface ObjectIdCardProps {
    objectId: string;
}

function ObjectIdCard({ objectId }: ObjectIdCardProps): JSX.Element {
    return (
        <DisplayStats
            label="Object ID"
            value={
                <div className="flex flex-col gap-xs">
                    <ObjectLink objectId={objectId} copyText={objectId} />
                </div>
            }
            tooltipPosition={TooltipPosition.Top}
            tooltipText="The unique onchain identifier of the Move object storing this notarization's state."
        />
    );
}

interface LastTxBlockCardProps {
    digest: string;
}

function LastTxBlockCard({ digest }: LastTxBlockCardProps): JSX.Element {
    return (
        <DisplayStats
            label="Last Transaction Block Digest"
            value={<TransactionLink digest={digest}>{formatDigest(digest)}</TransactionLink>}
            copyText={digest}
            onCopySuccess={onCopySuccess}
            tooltipPosition={TooltipPosition.Top}
            tooltipText="Hash of the most recent transaction that modified this notarization. Use it to inspect transaction details on the explorer."
        />
    );
}

interface StorageRebateCardProps {
    storageRebate: string;
}

function StorageRebateCard({ storageRebate }: StorageRebateCardProps): JSX.Element | null {
    const [storageRebateFormatted, symbol] = useFormatCoin({
        balance: storageRebate,
        format: CoinFormat.Full,
    });

    return (
        <DisplayStats
            label="Storage Rebate"
            value={`-${storageRebateFormatted}`}
            supportingLabel={symbol}
            tooltipPosition={TooltipPosition.Top}
            tooltipText="IOTA tokens locked as a storage deposit for this object. Partially refundable when the object is deleted or reduced in size."
        />
    );
}
