// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { DisplayStats, TooltipPosition } from '@iota/apps-ui-kit';
import { formatDate, useFormatCoin } from '@iota/core';
import { type IotaObjectData } from '@iota/iota-sdk/client';
import { CoinFormat, formatDigest } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import { ObjectLink, TransactionLink } from '~/components/ui';
import { onCopySuccess } from '~/lib/utils';
import { ErrorBoundary } from '~/components';
import { type OnChainAuditTrail } from '@iota/audit-trails/web';

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

    const dateFormat = (timestamp: bigint): string =>
        // Convert seconds to milliseconds for Date constructor
        formatDate(new Date(Number(timestamp)), ['year', 'month', 'day', 'hour', 'minute']);
    const createdAt = dateFormat(auditTrailObject.createdAt);
    const lastTransactionBlockDigest = objectData?.previousTransaction;

    return (
        <ErrorBoundary>
            <div className="flex flex-col gap-md">
                <div className={clsx('address-grid-container-top', 'no-image', 'no-description')}>
                    {objectId && (
                        <div>
                            <ObjectIdCard objectId={objectId} />
                        </div>
                    )}

                    {version && (
                        <div>
                            <DisplayStats
                                label="Version"
                                value={version}
                                tooltipPosition={TooltipPosition.Left}
                                tooltipText="Version of object in a progressive sequence."
                            />
                        </div>
                    )}

                    {storageRebate && (
                        <div>
                            <StorageRebateCard storageRebate={storageRebate} />
                        </div>
                    )}

                    {createdAt && (
                        <div>
                            <DisplayStats
                                label="Created at"
                                value={createdAt}
                                tooltipPosition={TooltipPosition.Left}
                                tooltipText="Timestamp of the transaction that first published this audit trail onchain."
                            />
                        </div>
                    )}

                    {sequenceNumber && (
                        <div>
                            <DisplayStats
                                label="Sequence"
                                value={sequenceNumber}
                                tooltipPosition={TooltipPosition.Left}
                                tooltipText="Version of state change in a progressive sequence."
                            />
                        </div>
                    )}

                    {lastTransactionBlockDigest && (
                        <div>
                            <LastTxBlockCard digest={lastTransactionBlockDigest} />
                        </div>
                    )}
                </div>
            </div>
        </ErrorBoundary>
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
            tooltipPosition={TooltipPosition.Left}
            tooltipText="The unique onchain identifier of the Move object storing this audit trail's state."
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
            tooltipPosition={TooltipPosition.Left}
            tooltipText="Hash of the most recent transaction that modified this audit trail. Use it to inspect transaction details on the explorer."
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
            tooltipPosition={TooltipPosition.Left}
            tooltipText="IOTA tokens locked as a storage deposit for this object. Partially refundable when the object is deleted or reduced in size."
        />
    );
}
