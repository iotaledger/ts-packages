// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { DisplayStats, TooltipPosition } from '@iota/apps-ui-kit';
import { useFormatCoin } from '@iota/core';
import { type IotaObjectData } from '@iota/iota-sdk/client';
import { CoinFormat, formatDigest, parseStructTag } from '@iota/iota-sdk/utils';
import { ObjectLink, TransactionLink } from '~/components/ui';
import { onCopySuccess } from '~/lib/utils';
import { DateDisplay, ErrorBoundary } from '~/components';
import { type OnChainAuditTrail } from '@iota/audit-trails/web';
import { getAuditTrailRecordsSize, getAuditTrailType } from '../../headerMetadataHelper';
import { useAuditTrailPkgId } from '~/contexts';

interface AuditTrailSummaryViewProps {
    auditTrailObject: OnChainAuditTrail;
    objectData: IotaObjectData;
}

export function AuditTrailSummaryView({
    auditTrailObject,
    objectData,
}: AuditTrailSummaryViewProps): JSX.Element {
    const objectId = objectData?.objectId;
    const storageRebate = objectData?.storageRebate;
    const version = `v${auditTrailObject.version}`;
    const sequenceNumber = `${auditTrailObject.sequenceNumber}`;
    const iotaAuditTrailPackage = useAuditTrailPkgId();

    const auditTrailType = iotaAuditTrailPackage
        ? getAuditTrailType(objectData, iotaAuditTrailPackage)
        : undefined;
    const auditTrailRecordsSize = getAuditTrailRecordsSize(auditTrailObject);

    const lastTransactionBlockDigest = objectData?.previousTransaction;

    return (
        <ErrorBoundary>
            <div className="flex flex-col gap-md">
                <div className="grid grid-cols-2 gap-sm">
                    {auditTrailType && <AuditTrailTypeCard auditTrailType={auditTrailType} />}
                    {objectId && (
                        <DisplayStats
                            label="Object ID"
                            value={
                                <div className="flex flex-col gap-xs">
                                    <ObjectLink objectId={objectId} copyText={objectId} />
                                </div>
                            }
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="The unique onchain identifier of the Move object storing this audit trail's state."
                        />
                    )}
                </div>
                <div className="grid grid-cols-2 gap-sm md:grid-cols-3">
                    {auditTrailRecordsSize && (
                        <DisplayStats
                            label="Records Size"
                            value={auditTrailRecordsSize}
                            tooltipPosition={TooltipPosition.Top}
                        />
                    )}
                    {version && (
                        <DisplayStats
                            label="Version"
                            value={version}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="Version of object in a progressive sequence."
                        />
                    )}
                    {storageRebate && <StorageRebateCard storageRebate={storageRebate} />}
                    {auditTrailObject.createdAt > 0n && (
                        <DisplayStats
                            label="Created at"
                            value={<DateDisplay timestamp={Number(auditTrailObject.createdAt)} />}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="Timestamp of the transaction that first published this audit trail onchain."
                        />
                    )}
                    {sequenceNumber && (
                        <DisplayStats
                            label="Sequence"
                            value={sequenceNumber}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="Version of state change in a progressive sequence."
                        />
                    )}
                    {lastTransactionBlockDigest && (
                        <DisplayStats
                            label="Last Transaction Block Digest"
                            value={
                                <TransactionLink digest={lastTransactionBlockDigest}>
                                    {formatDigest(lastTransactionBlockDigest)}
                                </TransactionLink>
                            }
                            copyText={lastTransactionBlockDigest}
                            onCopySuccess={onCopySuccess}
                            tooltipPosition={TooltipPosition.Top}
                            tooltipText="Hash of the most recent transaction that modified this audit trail. Use it to inspect transaction details on the explorer."
                        />
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
}

interface AuditTrailTypeCardProps {
    auditTrailType: NonNullable<ReturnType<typeof getAuditTrailType>>;
}
function AuditTrailTypeCard({ auditTrailType }: AuditTrailTypeCardProps) {
    const { address, module } = parseStructTag(auditTrailType.structTag);

    return (
        <DisplayStats
            label={auditTrailType.label}
            value={
                <ObjectLink objectId={`${address}?module=${module}`} label={auditTrailType.value}>
                    {auditTrailType.value}
                </ObjectLink>
            }
            copyText={auditTrailType.structTag}
            tooltipPosition={TooltipPosition.Top}
            tooltipText={auditTrailType.tooltipText}
            onCopySuccess={onCopySuccess}
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
