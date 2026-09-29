// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Badge,
    BadgeType,
    Button,
    ButtonSize,
    ButtonType,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    KeyValueInfo,
    LoadingIndicator,
    TitleSize,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { formatDigest } from '@iota/iota-sdk/utils';
import { Warning, Person } from '@iota/apps-ui-icons';
import {
    AddressLink,
    CollapsibleCard,
    DateDisplay,
    ObjectLink,
    TransactionLink,
} from '~/components';
import { RETENTION_BANNER_TEXT, RETENTION_BANNER_TITLE } from '~/lib/constants';
import {
    useGetNotarizationOwnerHistory,
    type OwnerEntry,
} from '../hooks/useGetNotarizationOwnerHistory';

enum OwnerLabel {
    Current = 'Current',
    Previous = 'Previous',
}

interface OwnersViewProps {
    objectId: string;
}

export function OwnersView({ objectId }: OwnersViewProps): JSX.Element {
    const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
        useGetNotarizationOwnerHistory(objectId);

    const owners = data?.owners;
    // Show the retention notice whenever we can't prove the full history is
    // available: no data yet, or the fetched pages never reached the creation tx.
    const showRetentionNotice = !hasNextPage && !(owners?.length && data?.hasCreationEntry);

    return (
        <div className="flex flex-col gap-sm">
            {isPending && (
                <div className="flex justify-center">
                    <LoadingIndicator size="w-6 h-6" text="Loading owners..." />
                </div>
            )}
            {isError && (
                <InfoBox
                    title="Error Fetching Owners"
                    supportingText={`Could not fetch owner history for object ${objectId} on the current network.`}
                    icon={<Warning />}
                    type={InfoBoxType.Error}
                    style={InfoBoxStyle.Elevated}
                />
            )}
            {owners && showRetentionNotice && (
                <InfoBox
                    title={RETENTION_BANNER_TITLE}
                    supportingText={RETENTION_BANNER_TEXT}
                    icon={<Warning />}
                    type={InfoBoxType.Warning}
                    style={InfoBoxStyle.Elevated}
                />
            )}
            {owners?.map((owner, index) => (
                <OwnerCard
                    key={owner.transactionDigest}
                    owner={owner}
                    label={index === 0 ? OwnerLabel.Current : OwnerLabel.Previous}
                />
            ))}
            {hasNextPage && (
                <div className="flex justify-center">
                    <Button
                        size={ButtonSize.Small}
                        type={ButtonType.Ghost}
                        text={isFetchingNextPage ? 'Loading...' : 'Identify More Owners'}
                        disabled={isFetchingNextPage}
                        onClick={() => fetchNextPage()}
                    />
                </div>
            )}
        </div>
    );
}

interface OwnerCardProps {
    owner: OwnerEntry;
    label: OwnerLabel;
}

function OwnerCard({ owner, label }: OwnerCardProps): JSX.Element {
    const badgeType = label === OwnerLabel.Current ? BadgeType.PrimarySoft : BadgeType.Neutral;

    return (
        <CollapsibleCard
            collapsible
            title="Owner"
            titleSize={TitleSize.Small}
            supportingTitleElement={
                <div className="ml-1 flex gap-x-1">
                    <Badge label={owner.ownerType} type={BadgeType.Neutral} />
                    <Badge label={label} type={badgeType} icon={<Person />} />
                </div>
            }
            footer={<OwnerCardFooter owner={owner} />}
        >
            <div className="flex flex-col gap-4 py-sm--rs">
                <OwnerType owner={owner} />
                <OwnershipTransactionLink owner={owner} />
                <TransactionDate timestampMs={owner.timestampMs} />
            </div>
        </CollapsibleCard>
    );
}

function OwnerType({ owner }: { owner: OwnerEntry }) {
    return (
        <div className="flex flex-wrap px-md--rs">
            <KeyValueInfo
                keyText="Type"
                value={owner.ownerType}
                fullwidth
                tooltipPosition={TooltipPosition.Top}
                tooltipText="The ownership type: address-owned, object-owned, or shared."
            />
        </div>
    );
}

function OwnerAddress({ owner }: { owner: OwnerEntry }) {
    return (
        <div className="flex flex-wrap px-md--rs">
            <KeyValueInfo
                keyText="Owner"
                value={
                    <OwnerAddressDisplay
                        ownerType={owner.ownerType}
                        ownerAddress={owner.ownerAddress}
                    />
                }
                fullwidth
                tooltipPosition={TooltipPosition.Top}
                tooltipText="The address that owns or owned this notarization object."
            />
        </div>
    );
}

interface OwnerAddressDisplayProps {
    ownerType: string;
    ownerAddress: string;
}

function OwnerAddressDisplay({ ownerType, ownerAddress }: OwnerAddressDisplayProps): JSX.Element {
    if (ownerType === 'AddressOwner') {
        return (
            <AddressLink
                address={ownerAddress}
                copyText={ownerAddress}
                className="[&>div]:max-w-[200px] [&>div]:truncate"
                display="block"
            />
        );
    }

    if (ownerType === 'ObjectOwner') {
        return <ObjectLink objectId={ownerAddress} copyText={ownerAddress} />;
    }

    if (ownerType === 'Shared') {
        return <ObjectLink objectId={ownerAddress} label="Shared" showAddressAlias={false} />;
    }

    return <span>{ownerAddress}</span>;
}

interface OwnerCardFooterProps {
    owner: OwnerEntry;
}

function OwnerCardFooter({ owner }: OwnerCardFooterProps): JSX.Element {
    return (
        <div className="flex flex-col gap-4 py-sm--rs">
            <OwnerAddress owner={owner} />
        </div>
    );
}

function TransactionDate({ timestampMs }: { timestampMs?: string | number | null }) {
    return (
        timestampMs && (
            <div className="flex flex-wrap px-md--rs">
                <KeyValueInfo
                    keyText="Date"
                    value={<DateDisplay timestamp={timestampMs} />}
                    fullwidth
                    tooltipPosition={TooltipPosition.Top}
                    tooltipText="When this ownership change occurred."
                />
            </div>
        )
    );
}

function OwnershipTransactionLink({ owner }: { owner: OwnerEntry }) {
    return (
        <div className="flex flex-wrap px-md--rs">
            <KeyValueInfo
                keyText="Transaction"
                value={
                    <TransactionLink digest={owner.transactionDigest}>
                        {formatDigest(owner.transactionDigest)}
                    </TransactionLink>
                }
                fullwidth
                tooltipPosition={TooltipPosition.Top}
                tooltipText="The transaction that assigned this owner to the notarization object."
            />
        </div>
    );
}
