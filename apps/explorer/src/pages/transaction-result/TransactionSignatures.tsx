// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode } from 'react';
import {
    Badge,
    BadgeSize,
    BadgeType,
    DisplayStats,
    DisplayStatsSize,
    DisplayStatsType,
    Table,
    TableBody,
    TableCellBase,
    TableCellText,
    TableRow,
    Tooltip,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { Info } from '@iota/apps-ui-icons';
import type { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { toSerializedSignature } from '@iota/iota-sdk/cryptography';
import { normalizeIotaAddress, toBase64 } from '@iota/iota-sdk/utils';
import { AddressLink, CollapsibleCard } from '~/components';
import {
    useDeserializedSignatures,
    type DeserializedSignature,
    type MultiSigParticipant,
    type MultiSigSignature,
} from '~/hooks';
import { getTransactionSponsor } from '~/lib/utils';
import { CopyButton } from './CopyButton';

interface FieldTableRow {
    field: string;
    value: ReactNode;
}

const PUBLIC_KEY_TOOLTIP =
    'The public key that produced this signature, prefixed with its scheme flag.';

const FIELD_TOOLTIPS: Record<string, string> = {
    'Derived Address': 'The address derived from the signer’s public key.',
    'Public Key': PUBLIC_KEY_TOOLTIP,
    'IOTA Public Key': PUBLIC_KEY_TOOLTIP,
    'Signature Bytes':
        'The raw signature over the transaction’s intent message (intent prefix and transaction data).',
    'Full Signature':
        'The serialized signature as submitted: scheme flag, signature and public key.',
};

function CopyableCellValue({ value }: { value: string }): JSX.Element {
    return (
        <div className="flex min-w-0 items-center gap-xxs">
            <TableCellText>
                <span className="break-all">{value}</span>
            </TableCellText>
            <CopyButton text={value} />
        </div>
    );
}

function DerivedAddressValue({
    address,
    isSender,
    signed,
}: {
    address: string;
    isSender?: boolean;
    signed?: boolean;
}): JSX.Element {
    return (
        <div className="flex min-w-0 flex-wrap items-center gap-xs">
            <AddressLink address={address} copyText={address} />
            {isSender && <Badge type={BadgeType.Success} label="Sender ✓" size={BadgeSize.Small} />}
            {signed !== undefined && (
                <Badge
                    type={signed ? BadgeType.Success : BadgeType.Neutral}
                    label={signed ? 'Signed ✓' : 'Not signed'}
                    size={BadgeSize.Small}
                />
            )}
        </div>
    );
}

function FieldsTable({ rows }: { rows: FieldTableRow[] }): JSX.Element {
    return (
        <div className="[&_td:first-child]:w-44 [&_tr:last-child_td]:border-b-0">
            <Table rowIndexes={rows.map((_, index) => index)}>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={index}>
                            <TableCellBase>
                                <div className="flex items-center gap-xxs">
                                    <TableCellText>{row.field}</TableCellText>
                                    {FIELD_TOOLTIPS[row.field] && (
                                        <Tooltip text={FIELD_TOOLTIPS[row.field]}>
                                            <Info className="h-3.5 w-3.5 text-iota-neutral-40 dark:text-iota-neutral-60" />
                                        </Tooltip>
                                    )}
                                </div>
                            </TableCellBase>
                            <TableCellBase>{row.value}</TableCellBase>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

interface SignatureCardProps {
    scheme: string;
    isSender?: boolean;
    isSponsor?: boolean;
    rows: FieldTableRow[];
}

function SignatureCard({ scheme, isSender, isSponsor, rows }: SignatureCardProps): JSX.Element {
    return (
        <div className="table-cell-border-color flex flex-col gap-xl rounded-lg border px-md--rs py-sm--rs">
            <div className="flex flex-wrap items-center gap-xs">
                <Badge type={BadgeType.PrimarySoft} label={scheme} size={BadgeSize.Small} />
                {isSender && (
                    <Badge type={BadgeType.Success} label="Sender" size={BadgeSize.Small} />
                )}
                {isSponsor && (
                    <Badge type={BadgeType.Warning} label="Sponsor" size={BadgeSize.Small} />
                )}
            </div>
            <FieldsTable rows={rows} />
        </div>
    );
}

function ParticipantCard({
    participant,
    index,
}: {
    participant: MultiSigParticipant;
    index: number;
}): JSX.Element {
    const publicKey = participant.publicKey.toIotaPublicKey();
    const signatureBytes = participant.signature ? toBase64(participant.signature) : undefined;
    const fullSignature = participant.signature
        ? toSerializedSignature({
              signature: participant.signature,
              signatureScheme: participant.signatureScheme,
              publicKey: participant.publicKey,
          })
        : undefined;

    const rows: FieldTableRow[] = [
        {
            field: 'Derived Address',
            value: (
                <DerivedAddressValue address={participant.address} signed={participant.signed} />
            ),
        },
        { field: 'Public Key', value: <CopyableCellValue value={publicKey} /> },
        ...(signatureBytes
            ? [{ field: 'Signature Bytes', value: <CopyableCellValue value={signatureBytes} /> }]
            : []),
        ...(fullSignature
            ? [{ field: 'Full Signature', value: <CopyableCellValue value={fullSignature} /> }]
            : []),
    ];

    return (
        <div className="table-cell-border-color flex flex-col gap-sm rounded-lg border px-md--rs py-sm--rs">
            <div className="flex flex-wrap items-center gap-xs">
                <span className="text-label-md text-iota-neutral-10 dark:text-iota-neutral-92">
                    Participant {index + 1}
                </span>
                <Badge
                    type={BadgeType.PrimarySoft}
                    label={participant.signatureScheme}
                    size={BadgeSize.Small}
                />
                <span className="text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                    weight {participant.weight}
                </span>
            </div>
            <FieldsTable rows={rows} />
        </div>
    );
}

interface SignatureBreakdownProps {
    signature: DeserializedSignature;
    sender?: string;
    sponsor?: string;
}

function getSignatureAddress(signature: DeserializedSignature): string {
    return 'address' in signature ? signature.address : signature.publicKey.toIotaAddress();
}

interface MultiSigBreakdownProps {
    signature: MultiSigSignature;
    sender?: string;
    sponsor?: string;
}

function MultiSigBreakdown({
    signature: data,
    sender,
    sponsor,
}: MultiSigBreakdownProps): JSX.Element {
    const { multisig } = data;
    const address = getSignatureAddress(data);
    const isSender = !!sender && normalizeIotaAddress(address) === normalizeIotaAddress(sender);
    const isSponsor = !!sponsor && normalizeIotaAddress(address) === normalizeIotaAddress(sponsor);

    return (
        <div className="flex flex-col gap-md">
            <div className="grid grid-cols-2 gap-md--rs pb-md sm:grid-cols-4">
                <DisplayStats
                    label="Scheme"
                    value="MultiSig"
                    type={DisplayStatsType.Secondary}
                    size={DisplayStatsSize.Default}
                />
                <DisplayStats
                    label="Participants"
                    tooltipText="Number of public keys that make up this multisig account."
                    tooltipPosition={TooltipPosition.Top}
                    value={`${multisig.participants.length} total`}
                    size={DisplayStatsSize.Default}
                />
                <DisplayStats
                    label="Threshold"
                    tooltipText="Minimum combined weight of participant signatures required for the transaction to be valid."
                    tooltipPosition={TooltipPosition.Top}
                    value={`${multisig.threshold} weight`}
                    size={DisplayStatsSize.Default}
                />
                <DisplayStats
                    label="Address"
                    tooltipText="The multisig address derived from all participant public keys, weights and the threshold."
                    tooltipPosition={TooltipPosition.Top}
                    value={
                        <div className="flex flex-col gap-xs">
                            <AddressLink address={address} copyText={address} />
                            {(isSender || isSponsor) && (
                                <div className="flex flex-wrap gap-xxs">
                                    {isSender && (
                                        <Badge
                                            type={BadgeType.Success}
                                            label="Sender ✓"
                                            size={BadgeSize.Small}
                                        />
                                    )}
                                    {isSponsor && (
                                        <Badge
                                            type={BadgeType.Warning}
                                            label="Sponsor"
                                            size={BadgeSize.Small}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    }
                    size={DisplayStatsSize.Default}
                />
            </div>
            {multisig.participants.map((participant, index) => (
                <ParticipantCard
                    key={participant.address}
                    participant={participant}
                    index={index}
                />
            ))}
        </div>
    );
}

function SignatureBreakdown({
    signature: data,
    sender,
    sponsor,
}: SignatureBreakdownProps): JSX.Element {
    if (data.signatureScheme === 'MultiSig') {
        return <MultiSigBreakdown signature={data} sender={sender} sponsor={sponsor} />;
    }

    const { signature, signatureScheme, serializedSignature } = data;
    const address = getSignatureAddress(data);
    const isSender = !!sender && normalizeIotaAddress(address) === normalizeIotaAddress(sender);
    const isSponsor = !!sponsor && normalizeIotaAddress(address) === normalizeIotaAddress(sponsor);
    const signatureBytes = toBase64(signature);

    const rows: FieldTableRow[] = [
        {
            field: 'Derived Address',
            value: <DerivedAddressValue address={address} isSender={isSender} />,
        },
        ...('publicKey' in data
            ? [
                  {
                      field: 'IOTA Public Key',
                      value: <CopyableCellValue value={data.publicKey.toIotaPublicKey()} />,
                  },
              ]
            : []),
        { field: 'Signature Bytes', value: <CopyableCellValue value={signatureBytes} /> },
        { field: 'Full Signature', value: <CopyableCellValue value={serializedSignature} /> },
    ];

    return (
        <SignatureCard
            scheme={signatureScheme}
            isSender={isSender}
            isSponsor={isSponsor}
            rows={rows}
        />
    );
}

interface TransactionSignaturesProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionSignatures({ transaction }: TransactionSignaturesProps): JSX.Element {
    const { userSignatures, sponsorSignature } = useDeserializedSignatures(transaction);
    const signatures = transaction.transaction?.txSignatures;
    const sender = transaction.transaction?.data.sender;
    const sponsor = getTransactionSponsor(transaction);
    const allSignatures = [...userSignatures, ...(sponsorSignature ? [sponsorSignature] : [])];

    return (
        <CollapsibleCard title="Signatures" hideBorder rawData={signatures}>
            {!!signatures?.length && (
                <div className="mx-md--rs mb-md--rs flex max-h-[560px] flex-col gap-sm overflow-y-auto">
                    {allSignatures.map((signature, index) => (
                        <SignatureBreakdown
                            key={index}
                            signature={signature}
                            sender={sender}
                            sponsor={sponsor}
                        />
                    ))}
                </div>
            )}
        </CollapsibleCard>
    );
}
