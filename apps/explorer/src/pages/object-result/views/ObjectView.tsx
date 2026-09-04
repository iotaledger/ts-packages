// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { DisplayStats, TooltipPosition } from '@iota/apps-ui-kit';
import { capitalize, resolveNFTMedia, useFormatCoin, useNFTMediaHeaders } from '@iota/core';
import { type IotaObjectResponse, type ObjectOwner } from '@iota/iota-sdk/client';
import {
    CoinFormat,
    formatAddress,
    formatDigest,
    formatType,
    normalizeStructTag,
    parseStructTag,
} from '@iota/iota-sdk/utils';
import { SortByDefault } from '@iota/apps-ui-icons';
import clsx from 'clsx';
import { useState } from 'react';
import { OwnerDisplay } from '~/components/object';
import { Link, ObjectLink, ObjectVideoImage, TransactionLink } from '~/components/ui';
import { OBJECT_FIELD_TOOLTIP } from '~/lib/constants';
import { extractName, onCopySuccess, parseObjectType, trimStdLibPrefix } from '~/lib/utils';

interface HeroVideoImageProps {
    title: string;
    subtitle: string;
    src: string;
}

function HeroVideoImage({ title, subtitle, src }: HeroVideoImageProps): JSX.Element {
    const [open, setOpen] = useState(false);

    return (
        <div className="group relative h-full">
            <ObjectVideoImage
                objectFit="contain"
                title={title}
                subtitle={subtitle}
                src={src}
                variant="fill"
                open={open}
                setOpen={setOpen}
                rounded="xl"
                disableVideoControls
            />
            <Link
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-3 top-3 hidden h-8 w-8 items-center justify-center rounded-md bg-white/40 backdrop-blur group-hover:flex"
            >
                <SortByDefault className="h-4 w-4 rotate-45" />
            </Link>
        </div>
    );
}

interface NameCardProps {
    name: string;
}

function NameCard({ name }: NameCardProps): JSX.Element {
    return <DisplayStats label="Name" value={name} />;
}

interface DescriptionCardProps {
    display?: {
        [key: string]: string;
    };
}

function DescriptionCard({ display }: DescriptionCardProps): JSX.Element {
    return <DisplayStats label="Description" value={display?.description ?? ''} />;
}

interface ObjectIdCardProps {
    objectId: string;
}

function ObjectIdCard({ objectId }: ObjectIdCardProps): JSX.Element {
    return (
        <DisplayStats
            label="Object ID"
            tooltipText={OBJECT_FIELD_TOOLTIP.objectId}
            tooltipPosition={TooltipPosition.Top}
            value={
                <div className="flex flex-col gap-xs">
                    <ObjectLink objectId={objectId} copyText={objectId} />
                </div>
            }
        />
    );
}

interface TypeCardCardProps {
    objectType: string;
}

function TypeCard({ objectType }: TypeCardCardProps): JSX.Element {
    const { address, module, typeParams, ...rest } = parseStructTag(objectType);

    const formattedTypeParams = typeParams.map((typeParam) => {
        if (typeof typeParam === 'string') {
            return typeParam;
        } else {
            return {
                ...typeParam,
                address: formatAddress(typeParam.address),
            };
        }
    });

    const structTag = {
        address: formatAddress(address),
        module,
        typeParams: formattedTypeParams,
        ...rest,
    };

    const normalizedStructTag = formatType(normalizeStructTag(structTag));
    return (
        <DisplayStats
            label="Type"
            value={
                <ObjectLink
                    objectId={`${address}?module=${module}`}
                    label={normalizedStructTag}
                    // A Move type is not an address: the alias lookup does not
                    // apply, and its `whitespace-nowrap` would overflow the card.
                    showAddressAlias={false}
                >
                    {normalizedStructTag}
                </ObjectLink>
            }
            tooltipText={objectType}
            tooltipPosition={TooltipPosition.Top}
            copyText={objectType}
            onCopySuccess={onCopySuccess}
        />
    );
}

interface VersionCardProps {
    version?: string;
}

function VersionCard({ version }: VersionCardProps): JSX.Element {
    return (
        <DisplayStats
            label="Version"
            tooltipText={OBJECT_FIELD_TOOLTIP.version}
            tooltipPosition={TooltipPosition.Top}
            value={version ?? '--'}
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
            tooltipText={OBJECT_FIELD_TOOLTIP.lastTransaction}
            tooltipPosition={TooltipPosition.Top}
            value={<TransactionLink digest={digest}>{formatDigest(digest)}</TransactionLink>}
            copyText={digest}
            onCopySuccess={onCopySuccess}
        />
    );
}

interface DigestCardProps {
    digest: string;
}

function DigestCard({ digest }: DigestCardProps): JSX.Element {
    return (
        <DisplayStats
            label="Object Digest"
            tooltipText={OBJECT_FIELD_TOOLTIP.digest}
            tooltipPosition={TooltipPosition.Top}
            value={formatDigest(digest)}
            copyText={digest}
            onCopySuccess={onCopySuccess}
        />
    );
}

interface OwnerCardProps {
    objOwner: ObjectOwner;
}

function OwnerCard({ objOwner }: OwnerCardProps): JSX.Element | null {
    return (
        <DisplayStats
            label="Owner"
            tooltipText={OBJECT_FIELD_TOOLTIP.owner}
            tooltipPosition={TooltipPosition.Top}
            value={
                <div className="flex flex-col gap-xs">
                    <OwnerDisplay objOwner={objOwner} />
                </div>
            }
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
            tooltipText={OBJECT_FIELD_TOOLTIP.storageRebate}
            tooltipPosition={TooltipPosition.Top}
            value={storageRebateFormatted}
            supportingLabel={symbol}
        />
    );
}

interface ObjectViewProps {
    data: IotaObjectResponse;
}

export function ObjectView({ data }: ObjectViewProps): JSX.Element {
    const display = data.data?.display?.data;
    const src = display?.image_url || '';
    const { data: nftMediaHeaders } = useNFTMediaHeaders(src);
    const { type: nftFileType } = resolveNFTMedia(src, nftMediaHeaders);

    const name = extractName(display);
    const objectType = parseObjectType(data);
    const objOwner = data.data?.owner;
    const storageRebate = data.data?.storageRebate;
    const objectId = data.data?.objectId;
    const lastTransactionBlockDigest = data.data?.previousTransaction;
    const objectDigest = data.data?.digest;

    const heroImageTitle = name || display?.description || trimStdLibPrefix(objectType);
    const heroImageSubtitle = `1 ${capitalize(nftFileType)} File`;
    const heroImageProps = {
        title: heroImageTitle,
        subtitle: heroImageSubtitle,
        src,
    };

    return (
        <div className="flex flex-col gap-md">
            <div
                className={clsx(
                    'address-grid-container-top',
                    !src && 'no-image',
                    (!name || !display) && 'no-description',
                )}
            >
                {src && (
                    <div style={{ gridArea: 'heroImage' }}>
                        <HeroVideoImage {...heroImageProps} />
                    </div>
                )}
                {name && (
                    <div style={{ gridArea: 'name' }}>
                        <NameCard name={name} />
                    </div>
                )}
                {display?.description && (
                    <div style={{ gridArea: 'description' }}>
                        <DescriptionCard display={display} />
                    </div>
                )}

                {objectId && (
                    <div style={{ gridArea: 'objectId' }}>
                        <ObjectIdCard objectId={objectId} />
                    </div>
                )}

                {objectType && objectType !== 'unknown' && (
                    <div style={{ gridArea: 'type' }}>
                        <TypeCard objectType={objectType} />
                    </div>
                )}

                {data.data?.version && (
                    <div style={{ gridArea: 'version' }}>
                        <VersionCard version={data.data?.version} />
                    </div>
                )}
                {lastTransactionBlockDigest && (
                    <div style={{ gridArea: 'lastTxBlock' }}>
                        <LastTxBlockCard digest={lastTransactionBlockDigest} />
                    </div>
                )}
                {objOwner && (
                    <div style={{ gridArea: 'owner' }}>
                        <OwnerCard objOwner={objOwner} />
                    </div>
                )}
                {storageRebate && (
                    <div style={{ gridArea: 'storageRebate' }}>
                        <StorageRebateCard storageRebate={storageRebate} />
                    </div>
                )}
                {objectDigest && (
                    <div style={{ gridArea: 'digest' }}>
                        <DigestCard digest={objectDigest} />
                    </div>
                )}
            </div>
            <div className="flex flex-row gap-md">
                {display && display.link && (
                    <div className="flex-1">
                        <DisplayStats
                            label="Link"
                            value={
                                <Link
                                    variant="mono"
                                    href={display.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {display.link}
                                </Link>
                            }
                        />
                    </div>
                )}
                {display && display.project_url && (
                    <div className="flex-1">
                        <DisplayStats
                            label="Website"
                            value={
                                <Link
                                    variant="mono"
                                    href={display.project_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {display.project_url}
                                </Link>
                            }
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
