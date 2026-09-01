// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode, useId, useMemo, useState } from 'react';
import { Badge, BadgeType, ButtonUnstyled, Divider, KeyValueInfo } from '@iota/apps-ui-kit';
import {
    CoinFiatValue,
    TransactionAction,
    getTransactionAction,
    useFormatCoin,
    type GasSummaryType,
} from '@iota/core';
import { ArrowBottomLeft, ArrowDown, ArrowTopRight } from '@iota/apps-ui-icons';
import { bcs } from '@iota/iota-sdk/bcs';
import type {
    IotaTransactionBlockResponse,
    OwnedObjectRef,
    TransactionBlockEffectsModifiedAtVersions,
} from '@iota/iota-sdk/client';
import {
    CoinFormat,
    formatAddress,
    formatDigest,
    fromBase64,
    toBase64,
} from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import {
    AddressLink,
    CheckpointSequenceLink,
    DateDisplay,
    EpochLink,
    ObjectLink,
    TransactionLink,
} from '~/components';
import { useAdvancedMode } from '~/contexts';
import {
    useBreakpoint,
    useDeserializedSignatures,
    type DeserializedSignature,
    type MultiSigParticipant,
    type MultiSigSignature,
} from '~/hooks';
import { getSendRecipientAddress, onCopySuccess } from '~/lib/utils';

interface ExpandableDetailsProps {
    id?: string;
    ariaLabel: string;
    children: ReactNode;
}

function ExpandableDetails({ id, ariaLabel, children }: ExpandableDetailsProps): JSX.Element {
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

function MultiSigParticipantRow({
    participant,
    index,
}: {
    participant: MultiSigParticipant;
    index: number;
}): JSX.Element {
    const [showPartialSignature, setShowPartialSignature] = useState(false);
    const publicKey = participant.publicKey.toIotaPublicKey();
    const partialSignature = participant.signature ? toBase64(participant.signature) : undefined;

    return (
        <div className="flex flex-col gap-xs">
            <div className="text-body-md font-medium text-iota-neutral-10 dark:text-iota-neutral-92">
                Participant {index + 1}
            </div>
            <KeyValueInfo
                layout="receipt"
                keyText="Status"
                value={
                    <span className="flex items-center gap-xs">
                        <span
                            aria-hidden="true"
                            className={clsx(
                                'h-2 w-2 shrink-0 rounded-full',
                                participant.signed
                                    ? 'bg-iota-primary-50 dark:bg-iota-primary-80'
                                    : 'bg-iota-neutral-70 dark:bg-iota-neutral-30',
                            )}
                        />
                        <span>{participant.signed ? 'Signed' : 'Not signed'}</span>
                    </span>
                }
            />
            <KeyValueInfo
                layout="receipt"
                keyText="Address"
                value={<AddressLink address={participant.address} copyText={participant.address} />}
            />
            <KeyValueInfo layout="receipt" keyText="Scheme" value={participant.signatureScheme} />
            <KeyValueInfo layout="receipt" keyText="Weight" value={participant.weight.toString()} />
            <KeyValueInfo
                layout="receipt"
                keyText="Public Key"
                value={publicKey}
                copyText={publicKey}
                onCopySuccess={onCopySuccess}
                isTruncated
            />
            {partialSignature && (
                <>
                    <KeyValueInfo
                        layout="receipt"
                        keyText="Partial Signature"
                        value={
                            <ButtonUnstyled
                                className="text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                                aria-expanded={showPartialSignature}
                                onClick={() => setShowPartialSignature(!showPartialSignature)}
                            >
                                {showPartialSignature
                                    ? 'Hide Partial Signature'
                                    : 'Show Partial Signature'}
                            </ButtonUnstyled>
                        }
                    />
                    {showPartialSignature && (
                        <KeyValueInfo
                            layout="receipt"
                            keyText="Signature"
                            value={partialSignature}
                            copyText={partialSignature}
                            onCopySuccess={onCopySuccess}
                        />
                    )}
                </>
            )}
        </div>
    );
}

function MultiSigBreakdown({ signature: data }: { signature: MultiSigSignature }): JSX.Element {
    const { multisig } = data;

    return (
        <div className="flex flex-col gap-sm">
            <KeyValueInfo layout="receipt" keyText="Scheme" value="MultiSig" />
            <KeyValueInfo
                layout="receipt"
                keyText="Participants"
                value={`${multisig.participants.length} total`}
            />
            <KeyValueInfo
                layout="receipt"
                keyText="Threshold"
                value={`${multisig.threshold} weight`}
            />
            <KeyValueInfo
                layout="receipt"
                keyText="Address"
                value={<AddressLink address={multisig.address} copyText={multisig.address} />}
            />
            <div className="flex flex-col gap-lg pt-sm">
                {multisig.participants.map((participant, index) => (
                    <MultiSigParticipantRow
                        key={participant.address}
                        participant={participant}
                        index={index}
                    />
                ))}
            </div>
        </div>
    );
}

function SignatureBreakdown({
    signature: data,
}: {
    signature: DeserializedSignature;
}): JSX.Element {
    if (data.signatureScheme === 'MultiSig') {
        return <MultiSigBreakdown signature={data} />;
    }

    const { signature, signatureScheme } = data;
    return (
        <div className="flex flex-col gap-sm">
            <KeyValueInfo layout="receipt" keyText="Scheme" value={signatureScheme} />
            <KeyValueInfo
                layout="receipt"
                keyText="Address"
                value={
                    <AddressLink
                        address={'address' in data ? data.address : data.publicKey.toIotaAddress()}
                        copyText={'address' in data ? data.address : data.publicKey.toIotaAddress()}
                    />
                }
            />
            {'publicKey' in data ? (
                <KeyValueInfo
                    layout="receipt"
                    keyText="IOTA Public Key"
                    value={data.publicKey.toIotaPublicKey()}
                    copyText={data.publicKey.toIotaPublicKey()}
                    onCopySuccess={onCopySuccess}
                />
            ) : null}
            <KeyValueInfo
                layout="receipt"
                keyText="Signature"
                copyText={toBase64(signature)}
                onCopySuccess={onCopySuccess}
                value={toBase64(signature)}
            />
        </div>
    );
}

interface GasFeeAmountProps {
    amount?: bigint | number | string;
    burnedAmount?: bigint | number | string;
}

function GasFeeAmount({ amount, burnedAmount }: GasFeeAmountProps): JSX.Element | null {
    const [formattedAmount, symbol] = useFormatCoin({ balance: amount, format: CoinFormat.Full });
    const [formattedBurnedAmount, burnedSymbol] = useFormatCoin({
        balance: burnedAmount,
        format: CoinFormat.Full,
    });

    if (!amount) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-baseline gap-xxs">
            <span>
                {formattedAmount} {symbol}
            </span>
            <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                {BigInt(amount).toLocaleString()} (nano)
            </span>
            {!!burnedAmount && (
                <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                    Burnt: {formattedBurnedAmount} {burnedSymbol} (
                    {BigInt(burnedAmount).toLocaleString()} nano)
                </span>
            )}
        </div>
    );
}

interface GasPaymentObjectsSummaryProps {
    payments: Array<{ objectId: string }>;
    showAll: boolean;
    onToggle: () => void;
    detailsId: string;
}

function GasPaymentObjectsSummary({
    payments,
    showAll,
    onToggle,
    detailsId,
}: GasPaymentObjectsSummaryProps): JSX.Element {
    const hasMorePayments = payments.length > 2;

    return (
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-x-sm gap-y-xxs">
            {!showAll &&
                payments
                    .slice(0, 2)
                    .map((payment) => (
                        <ObjectLink
                            key={payment.objectId}
                            objectId={payment.objectId}
                            label={formatAddress(payment.objectId)}
                            copyText={payment.objectId}
                            className="text-label-md"
                        />
                    ))}
            {hasMorePayments && (
                <ButtonUnstyled
                    className="inline-flex items-center gap-xxxs text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                    aria-controls={detailsId}
                    aria-expanded={showAll}
                    onClick={onToggle}
                >
                    {showAll ? 'Show Less' : `Show ${payments.length - 2} More`}
                    <ArrowDown
                        className={clsx(
                            'h-4 w-4 transition-transform ease-linear',
                            showAll && 'rotate-180',
                        )}
                    />
                </ButtonUnstyled>
            )}
        </div>
    );
}

interface GasPaymentObjectsDetailsProps {
    payments: Array<{ objectId: string }>;
    detailsId: string;
}

function GasPaymentObjectsDetails({
    payments,
    detailsId,
}: GasPaymentObjectsDetailsProps): JSX.Element {
    return (
        <ExpandableDetails id={detailsId} ariaLabel="Gas payment object details">
            <div className="flex items-center justify-between gap-sm text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                <span className="shrink-0">Objects</span>
                <span className="shrink-0">
                    {payments.length} Gas Object{payments.length === 1 ? '' : 's'}
                </span>
            </div>
            <div className="flex max-h-64 flex-col overflow-y-auto pr-xxs">
                {payments.map((payment, index) => (
                    <div
                        key={payment.objectId}
                        className={clsx(
                            'min-w-0 py-xs',
                            index > 0 &&
                                'border-t border-iota-neutral-92 dark:border-iota-neutral-12',
                        )}
                    >
                        <div className="flex max-w-full justify-start overflow-x-auto md:justify-end">
                            <div className="min-w-max">
                                <ObjectLink
                                    objectId={payment.objectId}
                                    noTruncate
                                    copyText={payment.objectId}
                                    className="text-label-md"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ExpandableDetails>
    );
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

function ObjectRefList({
    refs,
}: {
    refs: Array<{ objectId: string; version?: string }>;
}): JSX.Element {
    return (
        <div className="flex max-h-64 flex-col overflow-y-auto pr-xxs">
            {refs.map((ref, index) => (
                <div
                    key={ref.objectId}
                    className={clsx(
                        'min-w-0 py-xs',
                        index > 0 && 'border-t border-iota-neutral-92 dark:border-iota-neutral-12',
                    )}
                >
                    <div className="flex max-w-full justify-start overflow-x-auto md:justify-end">
                        <div className="flex min-w-max flex-col items-end gap-xxs">
                            <ObjectLink
                                objectId={ref.objectId}
                                noTruncate
                                alignEnd
                                copyText={ref.objectId}
                                className="text-label-md"
                            />
                            {ref.version && (
                                <span className="text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                                    v{ref.version}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function TransactionDependencies({ dependencies }: { dependencies: string[] }): JSX.Element {
    return (
        <div className="flex max-h-64 flex-col overflow-y-auto pr-xxs">
            {dependencies.map((digest, index) => (
                <div
                    key={digest}
                    className={clsx(
                        'min-w-0 py-xs',
                        index > 0 && 'border-t border-iota-neutral-92 dark:border-iota-neutral-12',
                    )}
                >
                    <div className="flex max-w-full justify-start overflow-x-auto md:justify-end">
                        <div className="min-w-max">
                            <TransactionLink
                                digest={digest}
                                noTruncate
                                copyText={digest}
                                className="text-label-md"
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

interface EffectsBreakdownProps {
    dependencies?: string[];
    modifiedAtVersions?: TransactionBlockEffectsModifiedAtVersions[];
    sharedObjects?: Array<{ objectId: string; version: string }>;
    gasObject?: OwnedObjectRef;
    unwrapped?: OwnedObjectRef[];
    eventsDigest?: string | null;
    lamportVersion?: string;
    expiration?: string;
    isMediumOrAbove: boolean;
}

function EffectsBreakdown({
    dependencies,
    modifiedAtVersions,
    sharedObjects,
    gasObject,
    unwrapped,
    eventsDigest,
    lamportVersion,
    expiration,
    isMediumOrAbove,
}: EffectsBreakdownProps): JSX.Element {
    return (
        <div className="flex flex-col gap-sm" data-testid="effects-breakdown">
            <div className="text-body-md font-medium text-iota-neutral-10 dark:text-iota-neutral-92">
                Effects
            </div>
            {expiration && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Expiration"
                    value={expiration}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {lamportVersion && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Lamport Version"
                    value={lamportVersion}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {gasObject && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Gas Object"
                    value={
                        <ObjectLink
                            objectId={gasObject.reference.objectId}
                            copyText={gasObject.reference.objectId}
                        />
                    }
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {eventsDigest && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Events Digest"
                    value={formatDigest(eventsDigest)}
                    copyText={eventsDigest}
                    onCopySuccess={onCopySuccess}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {!!dependencies?.length && (
                <>
                    <KeyValueInfo
                        layout="receipt"
                        keyText="Dependencies"
                        value={`${dependencies.length} transaction${dependencies.length === 1 ? '' : 's'}`}
                        fullwidth={!isMediumOrAbove}
                    />
                    <ExpandableDetails ariaLabel="Dependency transactions">
                        <TransactionDependencies dependencies={dependencies} />
                    </ExpandableDetails>
                </>
            )}
            {!!modifiedAtVersions?.length && (
                <>
                    <KeyValueInfo
                        layout="receipt"
                        keyText="Modified At Versions"
                        value={`${modifiedAtVersions.length} object${modifiedAtVersions.length === 1 ? '' : 's'}`}
                        fullwidth={!isMediumOrAbove}
                    />
                    <ExpandableDetails ariaLabel="Modified at versions">
                        <ObjectRefList
                            refs={modifiedAtVersions.map((v) => ({
                                objectId: v.objectId,
                                version: v.sequenceNumber,
                            }))}
                        />
                    </ExpandableDetails>
                </>
            )}
            {!!sharedObjects?.length && (
                <>
                    <KeyValueInfo
                        layout="receipt"
                        keyText="Shared Objects"
                        value={`${sharedObjects.length} object${sharedObjects.length === 1 ? '' : 's'}`}
                        fullwidth={!isMediumOrAbove}
                    />
                    <ExpandableDetails ariaLabel="Shared objects">
                        <ObjectRefList refs={sharedObjects} />
                    </ExpandableDetails>
                </>
            )}
            {!!unwrapped?.length && (
                <>
                    <KeyValueInfo
                        layout="receipt"
                        keyText="Unwrapped"
                        value={`${unwrapped.length} object${unwrapped.length === 1 ? '' : 's'}`}
                        fullwidth={!isMediumOrAbove}
                    />
                    <ExpandableDetails ariaLabel="Unwrapped objects">
                        <ObjectRefList
                            refs={unwrapped.map((o) => ({ objectId: o.reference.objectId }))}
                        />
                    </ExpandableDetails>
                </>
            )}
        </div>
    );
}

interface TransactionOverviewProps {
    transaction: IotaTransactionBlockResponse;
    gasSummary?: GasSummaryType;
}

export function TransactionOverview({
    transaction,
    gasSummary,
}: TransactionOverviewProps): JSX.Element {
    const [showAllGasPayment, setShowAllGasPayment] = useState(false);
    const [showGasFeeBreakdown, setShowGasFeeBreakdown] = useState(false);
    const [showFullSignatures, setShowFullSignatures] = useState(false);
    const gasPaymentDetailsId = `gas-payment-objects-${useId().replace(/:/g, '')}`;
    const isMediumOrAbove = useBreakpoint('md');
    const { userSignatures, sponsorSignature } = useDeserializedSignatures(transaction);
    const { isAdvancedMode } = useAdvancedMode();
    const expiration = useMemo(
        () => getExpiration(transaction.rawTransaction),
        [transaction.rawTransaction],
    );

    const transactionKindName = transaction.transaction?.data.transaction?.kind;
    const isProgrammableTransaction = transactionKindName === 'ProgrammableTransaction';
    const sender = transaction.transaction?.data.sender;
    const signatures = transaction.transaction?.txSignatures;
    const action = getTransactionAction(transaction, sender);
    const recipient =
        action === TransactionAction.Send
            ? getSendRecipientAddress(transaction, sender)
            : undefined;
    const totalGas = gasSummary?.totalGas;
    const gasBudget = gasSummary?.budget;
    const gasPayment = gasSummary?.payment;
    const gasOwner = gasSummary?.owner;
    const gasPrice = gasSummary?.price;
    const gasUsed = gasSummary?.gasUsed;

    const [formattedTotalGas, totalGasSymbol] = useFormatCoin({
        balance: totalGas,
        format: CoinFormat.Full,
    });
    const [formattedBudget, budgetSymbol] = useFormatCoin({
        balance: gasBudget,
        format: CoinFormat.Full,
    });

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-sm p-md--rs">
            {transactionKindName && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Transaction Type"
                    value={
                        <div className="whitespace-nowrap">
                            <Badge label={transactionKindName} type={BadgeType.PrimarySoft} />
                        </div>
                    }
                    fullwidth={!isMediumOrAbove}
                />
            )}
            <KeyValueInfo
                layout="receipt"
                keyText="Digest"
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
            {isProgrammableTransaction && totalGas && (
                <div data-testid="gas-breakdown">
                    <KeyValueInfo
                        layout="receipt"
                        keyText="Total Gas Fee"
                        value={`${formattedTotalGas} ${totalGasSymbol}`}
                        supportingLabel={
                            <div className="flex flex-row items-baseline gap-xs">
                                <CoinFiatValue amount={totalGas ?? 0} withParentheses={false} />
                                {gasUsed && (
                                    <ButtonUnstyled
                                        className="flex flex-row items-center gap-xxxs text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                                        onClick={() => setShowGasFeeBreakdown(!showGasFeeBreakdown)}
                                    >
                                        {showGasFeeBreakdown ? 'Show Less' : 'Show More'}
                                        <ArrowDown
                                            className={clsx(
                                                'h-4 w-4 transition-transform ease-linear',
                                                showGasFeeBreakdown && 'rotate-180',
                                            )}
                                        />
                                    </ButtonUnstyled>
                                )}
                            </div>
                        }
                        fullwidth={!isMediumOrAbove}
                    />
                </div>
            )}
            {isProgrammableTransaction && showGasFeeBreakdown && gasUsed && (
                <ExpandableDetails ariaLabel="Gas fee details">
                    {gasPrice && (
                        <KeyValueInfo
                            layout="receipt"
                            keyText="Gas Price"
                            value={<GasFeeAmount amount={gasPrice} />}
                            fullwidth={!isMediumOrAbove}
                        />
                    )}
                    {gasUsed.computationCost && (
                        <KeyValueInfo
                            layout="receipt"
                            keyText="Computation Fee"
                            value={
                                <GasFeeAmount
                                    amount={gasUsed.computationCost}
                                    burnedAmount={gasUsed.computationCostBurned}
                                />
                            }
                            fullwidth={!isMediumOrAbove}
                        />
                    )}
                    {gasUsed.storageCost && (
                        <KeyValueInfo
                            layout="receipt"
                            keyText="Storage Fee"
                            value={<GasFeeAmount amount={gasUsed.storageCost} />}
                            fullwidth={!isMediumOrAbove}
                        />
                    )}
                    {gasUsed.storageRebate && (
                        <KeyValueInfo
                            layout="receipt"
                            keyText="Storage Rebate"
                            value={<GasFeeAmount amount={-Number(gasUsed.storageRebate)} />}
                            fullwidth={!isMediumOrAbove}
                        />
                    )}
                </ExpandableDetails>
            )}
            {isProgrammableTransaction && gasBudget && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Gas Budget"
                    value={`${formattedBudget} ${budgetSymbol}`}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {isProgrammableTransaction && !!gasPayment?.length && (
                <>
                    <KeyValueInfo
                        layout="receipt"
                        keyText="Gas Payment Objects"
                        value={
                            <GasPaymentObjectsSummary
                                payments={gasPayment}
                                showAll={showAllGasPayment}
                                detailsId={gasPaymentDetailsId}
                                onToggle={() => setShowAllGasPayment(!showAllGasPayment)}
                            />
                        }
                        fullwidth={!isMediumOrAbove}
                    />
                    {showAllGasPayment && (
                        <GasPaymentObjectsDetails
                            payments={gasPayment}
                            detailsId={gasPaymentDetailsId}
                        />
                    )}
                </>
            )}
            {isProgrammableTransaction && gasOwner && (
                <KeyValueInfo
                    layout="receipt"
                    keyText="Gas Object Owner"
                    value={<AddressLink address={gasOwner} />}
                    copyText={gasOwner}
                    onCopySuccess={onCopySuccess}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {!!signatures?.length && (
                <>
                    <KeyValueInfo
                        layout="receipt"
                        keyText={signatures.length > 1 ? 'User Signatures' : 'User Signature'}
                        value={
                            <ButtonUnstyled
                                className="flex flex-row items-center gap-xxxs text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                                aria-controls="user-signature-details"
                                aria-expanded={showFullSignatures}
                                onClick={() => setShowFullSignatures(!showFullSignatures)}
                            >
                                {showFullSignatures ? 'Show Less' : 'Show More'}
                                <ArrowDown
                                    className={clsx(
                                        'h-4 w-4 transition-transform ease-linear',
                                        showFullSignatures && 'rotate-180',
                                    )}
                                />
                            </ButtonUnstyled>
                        }
                        fullwidth={!isMediumOrAbove}
                    />
                    {showFullSignatures && (
                        <ExpandableDetails
                            id="user-signature-details"
                            ariaLabel="Signature details"
                        >
                            <div className="flex max-h-64 flex-col gap-lg overflow-y-auto pr-xxs">
                                {[
                                    ...userSignatures,
                                    ...(sponsorSignature ? [sponsorSignature] : []),
                                ].map((signature, index) => (
                                    <div key={index} className="flex w-full flex-col gap-md">
                                        {index > 0 && <Divider />}
                                        <SignatureBreakdown signature={signature} />
                                    </div>
                                ))}
                            </div>
                        </ExpandableDetails>
                    )}
                </>
            )}
            {isAdvancedMode && transaction.effects && (
                <>
                    <Divider />
                    <EffectsBreakdown
                        dependencies={transaction.effects.dependencies}
                        modifiedAtVersions={transaction.effects.modifiedAtVersions}
                        sharedObjects={transaction.effects.sharedObjects}
                        gasObject={transaction.effects.gasObject}
                        unwrapped={transaction.effects.unwrapped}
                        eventsDigest={transaction.effects.eventsDigest}
                        lamportVersion={transaction.effects.gasObject?.reference.version}
                        expiration={expiration}
                        isMediumOrAbove={isMediumOrAbove}
                    />
                </>
            )}
        </div>
    );
}
