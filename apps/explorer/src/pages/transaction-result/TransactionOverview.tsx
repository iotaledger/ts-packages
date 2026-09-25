// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode, useMemo } from 'react';
import { Badge, BadgeType, KeyValueInfo } from '@iota/apps-ui-kit';
import { TransactionAction, getTransactionAction } from '@iota/core';
import { ArrowBottomLeft, ArrowTopRight, CheckmarkFilled, Warning } from '@iota/apps-ui-icons';
import { bcs } from '@iota/iota-sdk/bcs';
import type { IotaTransactionBlockResponse, TransactionEffects } from '@iota/iota-sdk/client';
import { TransactionDataBuilder } from '@iota/iota-sdk/transactions';
import { fromBase64 } from '@iota/iota-sdk/utils';
import { AddressLink, CheckpointSequenceLink, DateDisplay, EpochLink } from '~/components';
import { useAdvancedMode } from '~/contexts';
import { useBreakpoint } from '~/hooks';
import { getSendRecipientAddress, getTransactionSponsor, onCopySuccess } from '~/lib/utils';

function getDigestIntegrity(
    rawTransaction: string | undefined,
    digest: string,
): boolean | undefined {
    if (!rawTransaction) {
        return undefined;
    }

    try {
        const [{ intentMessage }] = bcs.SenderSignedData.parse(fromBase64(rawTransaction));
        const transactionDataBytes = bcs.TransactionData.serialize(intentMessage.value).toBytes();
        const derivedDigest = TransactionDataBuilder.getDigestFromBytes(transactionDataBytes);
        return derivedDigest === digest;
    } catch {
        return undefined;
    }
}

function getExpiration(rawTransaction?: string): string | undefined {
    if (!rawTransaction) {
        return undefined;
    }

    try {
        const [{ intentMessage }] = bcs.SenderSignedData.parse(fromBase64(rawTransaction));
        const expiration = intentMessage.value.V1.expiration;
        return 'Epoch' in expiration ? `Epoch ${expiration.Epoch}` : 'No Expiration';
    } catch {
        return undefined;
    }
}

function getLamportVersion(effects?: TransactionEffects): string | undefined {
    const touchedRefs = [
        ...(effects?.mutated ?? []),
        ...(effects?.created ?? []),
        ...(effects?.unwrapped ?? []),
    ];

    return touchedRefs.reduce<string | undefined>((highest, { reference }) => {
        const version = reference.version;
        return highest === undefined || Number(version) > Number(highest) ? version : highest;
    }, undefined);
}

interface ExpandableDetailsProps {
    id?: string;
    ariaLabel: string;
    children: ReactNode;
}

export function ExpandableDetails({
    id,
    ariaLabel,
    children,
}: ExpandableDetailsProps): JSX.Element {
    return (
        <div
            id={id}
            role="region"
            aria-label={ariaLabel}
            className="ml-xs flex flex-col gap-md border-x border-iota-neutral-92 px-md py-md dark:border-iota-neutral-12"
        >
            {children}
        </div>
    );
}

interface TransactionOverviewProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionOverview({ transaction }: TransactionOverviewProps): JSX.Element {
    const isMediumOrAbove = useBreakpoint('md');
    const { isAdvancedMode } = useAdvancedMode();

    const transactionKindName = transaction.transaction?.data.transaction?.kind;
    const sender = transaction.transaction?.data.sender;
    const sponsor = getTransactionSponsor(transaction);
    const action = getTransactionAction(transaction, sender);
    const recipient =
        action === TransactionAction.Send
            ? getSendRecipientAddress(transaction, sender)
            : undefined;
    const digestMatches = useMemo(
        () => getDigestIntegrity(transaction.rawTransaction, transaction.digest),
        [transaction.rawTransaction, transaction.digest],
    );
    const expiration = useMemo(
        () => getExpiration(transaction.rawTransaction),
        [transaction.rawTransaction],
    );
    const lamportVersion = useMemo(
        () => getLamportVersion(transaction.effects ?? undefined),
        [transaction.effects],
    );

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-sm p-md--rs">
            {transactionKindName && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Transaction Type"
                    value={
                        <div className="flex items-center gap-xs whitespace-nowrap">
                            <Badge label={transactionKindName} type={BadgeType.PrimarySoft} />
                            {sponsor && <Badge label="Sponsored" type={BadgeType.Warning} />}
                        </div>
                    }
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {isAdvancedMode && digestMatches !== undefined && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Integrity"
                    tooltipText="The transaction digest is recomputed from the raw BCS-encoded transaction data and compared against the digest reported by the network."
                    value={
                        <span className="flex items-center gap-xxs">
                            {digestMatches ? (
                                <CheckmarkFilled className="h-4 w-4 shrink-0" />
                            ) : (
                                <Warning className="h-4 w-4 shrink-0" />
                            )}
                            {digestMatches
                                ? 'digest re-derived from the raw BCS — matches'
                                : 'digest re-derived from the raw BCS — mismatch'}
                        </span>
                    }
                    fullwidth={!isMediumOrAbove}
                />
            )}
            <KeyValueInfo
                layout="receipt"
                keyText="Digest"
                tooltipText="The unique hash that identifies this transaction on the network."
                value={transaction.digest}
                copyText={transaction.digest}
                onCopySuccess={onCopySuccess}
                isTruncated
                fullwidth={!isMediumOrAbove}
            />
            {transaction.checkpoint && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Checkpoint"
                    tooltipText="The checkpoint that finalized this transaction. Once included in a checkpoint, a transaction is final."
                    value={
                        <CheckpointSequenceLink sequence={transaction.checkpoint}>
                            {Number(transaction.checkpoint).toLocaleString()}
                        </CheckpointSequenceLink>
                    }
                    copyText={transaction.checkpoint}
                    onCopySuccess={onCopySuccess}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {transaction.effects?.executedEpoch && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Epoch"
                    value={
                        <EpochLink epoch={transaction.effects.executedEpoch}>
                            {transaction.effects.executedEpoch}
                        </EpochLink>
                    }
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {isAdvancedMode && expiration && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Expiration"
                    tooltipText="The epoch after which this transaction would no longer be valid, if set by the sender."
                    value={expiration}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {isAdvancedMode && lamportVersion !== undefined && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Lamport Version"
                    tooltipText="The highest object version written by this transaction, used to order causally dependent transactions."
                    value={lamportVersion}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {transaction.timestampMs && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Timestamp"
                    value={
                        <DateDisplay
                            timestamp={transaction.timestampMs}
                            type="transaction"
                            showTimeAgo
                        />
                    }
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {sender && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Sender"
                    keyIcon={
                        <ArrowTopRight className="h-4 w-4 shrink-0 text-iota-neutral-40 dark:text-iota-neutral-60" />
                    }
                    value={<AddressLink address={sender} />}
                    copyText={sender}
                    onCopySuccess={onCopySuccess}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {sponsor && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Sponsor"
                    tooltipText="The account that paid the gas for this transaction on behalf of the sender."
                    value={<AddressLink address={sponsor} />}
                    copyText={sponsor}
                    onCopySuccess={onCopySuccess}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {recipient && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Recipient"
                    keyIcon={
                        <ArrowBottomLeft className="h-4 w-4 shrink-0 text-iota-neutral-40 dark:text-iota-neutral-60" />
                    }
                    value={<AddressLink address={recipient} />}
                    copyText={recipient}
                    onCopySuccess={onCopySuccess}
                    fullwidth={!isMediumOrAbove}
                />
            )}
        </div>
    );
}
