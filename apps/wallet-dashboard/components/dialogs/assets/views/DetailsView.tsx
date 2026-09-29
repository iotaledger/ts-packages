// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    ExplorerLinkType,
    useNftDetails,
    Collapsible,
    useNFTBasicData,
    NFTMediaDisplayCard,
    NameAvatar,
    NameAvatarSize,
    useGetDefaultIotaName,
    formatIotaName,
    NamedAddressTooltip,
    toast,
} from '@iota/core';
import { Button, ButtonType, Header, KeyValueInfo } from '@iota/apps-ui-kit';
import { formatAddress } from '@iota/iota-sdk/utils';
import { DialogLayoutBody, DialogLayoutFooter } from '../../layout';
import { IotaObjectData } from '@iota/iota-sdk/client';
import { ExplorerLink } from '@/components/ExplorerLink';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { useExternalLink } from '@/hooks';
import { Transaction } from '@iota/iota-sdk/transactions';
import { Loader } from '@iota/apps-ui-icons';
import { useQueryClient } from '@tanstack/react-query';

interface DetailsViewProps {
    asset: IotaObjectData;
    onClose: () => void;
    onSend: () => void;
    onBack?: () => void;
}

export function DetailsView({ onClose, asset, onSend, onBack }: DetailsViewProps) {
    const account = useCurrentAccount();

    const senderAddress = account?.address ?? '';
    const objectId = asset.objectId;

    const {
        nftName,
        nftImageUrl,
        nftDisplayData,
        ownerAddress,
        isAssetTransferable,
        metaKeys,
        metaValues,
        isContainedInKiosk,
        kioskItem,
        objectData,
        nftBurnFunction,
    } = useNftDetails(objectId, senderAddress);
    const { data: iotaName } = useGetDefaultIotaName(ownerAddress);
    const { fileExtensionType, filePath } = useNFTBasicData(objectData);
    const { mutateAsync: signAndExecuteTransaction, isPending: isTransactionPending } =
        useSignAndExecuteTransaction();
    const queryClient = useQueryClient();

    const handleMoreAboutKiosk = useExternalLink('https://docs.iota.org/developer/ts-sdk/kiosk/', {
        type: 'ts-sdk-documentation',
    });

    const handleMarketplace = useExternalLink(
        'https://docs.iota.org/developer/iota-101/nft/marketplace',
        {
            type: 'marketplace',
        },
    );

    const handleBurnAsset = async () => {
        if (!account || !objectId || !nftBurnFunction) return;
        try {
            const tx = new Transaction();

            tx.setSender(account.address);

            tx.moveCall({
                target: nftBurnFunction,
                arguments: [tx.object(objectId)],
            });

            await signAndExecuteTransaction(
                {
                    transaction: tx,
                    options: {
                        showEffects: true,
                    },
                },
                {
                    onSuccess: () => {
                        toast.success('Asset burnt successfully');
                        queryClient.invalidateQueries({
                            queryKey: ['get-owned-objects', senderAddress],
                        });
                        onClose();
                    },
                    onError: () => {
                        toast.error('Failed to burn asset');
                    },
                },
            );
        } catch (error) {
            toast.error('Failed to burn asset');
            console.error('Failed to burn asset:', error);
        }
    };

    return (
        <>
            <Header title="Asset" onClose={onClose} titleCentered onBack={onBack} />
            <DialogLayoutBody>
                <div className="flex w-full flex-col items-center justify-center gap-xs">
                    <div className="w-[172px]">
                        <NFTMediaDisplayCard
                            src={nftImageUrl}
                            title={nftName || 'NFT'}
                            isHoverable={false}
                        />
                    </div>
                    <ExplorerLink type={ExplorerLinkType.Object} objectID={objectId}>
                        <Button type={ButtonType.Ghost} text="View on Explorer" />
                    </ExplorerLink>
                    <div className="flex w-full flex-col gap-md">
                        <div className="flex flex-col gap-xxxs">
                            <span className="break-words text-title-lg text-iota-neutral-10 dark:text-iota-neutral-92">
                                {nftDisplayData?.name}
                            </span>
                            {nftDisplayData?.description ? (
                                <span className="break-words text-body-md text-iota-neutral-60">
                                    {nftDisplayData?.description}
                                </span>
                            ) : null}
                        </div>

                        {(nftDisplayData?.projectUrl || !!nftDisplayData?.creator) && (
                            <div className="flex flex-col gap-xs">
                                {nftDisplayData?.projectUrl && (
                                    <KeyValueInfo
                                        keyText="Website"
                                        value={nftDisplayData?.projectUrl}
                                        fullwidth
                                    />
                                )}
                                {nftDisplayData?.creator && (
                                    <KeyValueInfo
                                        keyText="Creator"
                                        value={nftDisplayData?.creator ?? '-'}
                                        fullwidth
                                    />
                                )}
                            </div>
                        )}

                        <Collapsible defaultOpen title="Details">
                            <div className="flex flex-col gap-xs px-md pb-xs pt-sm">
                                {ownerAddress && (
                                    <KeyValueInfo
                                        keyText="Owner"
                                        value={
                                            <NamedAddressTooltip
                                                name={iotaName}
                                                address={ownerAddress}
                                            >
                                                <span className="inline-flex items-center gap-xs">
                                                    <NameAvatar
                                                        address={ownerAddress}
                                                        size={NameAvatarSize.Xxs}
                                                    />
                                                    <ExplorerLink
                                                        type={ExplorerLinkType.Address}
                                                        address={ownerAddress}
                                                    >
                                                        <span data-amp-mask>
                                                            {formatIotaName(iotaName) ||
                                                                formatAddress(ownerAddress)}
                                                        </span>
                                                    </ExplorerLink>
                                                </span>
                                            </NamedAddressTooltip>
                                        }
                                        fullwidth
                                    />
                                )}
                                {objectId && (
                                    <KeyValueInfo
                                        keyText="Object ID"
                                        value={<span data-amp-mask>{formatAddress(objectId)}</span>}
                                        fullwidth
                                    />
                                )}
                                <KeyValueInfo
                                    keyText="Media Type"
                                    value={
                                        filePath && fileExtensionType.name && fileExtensionType.type
                                            ? `${fileExtensionType.name} ${fileExtensionType.type}`
                                            : '-'
                                    }
                                    fullwidth
                                />
                            </div>
                        </Collapsible>
                        {metaKeys.length ? (
                            <Collapsible defaultOpen title="Attributes">
                                <div className="flex flex-col gap-xs px-md pb-xs pt-sm">
                                    {metaKeys.map((aKey, idx) => {
                                        return (
                                            <KeyValueInfo
                                                key={idx}
                                                keyText={aKey}
                                                value={
                                                    typeof metaValues[idx] === 'object'
                                                        ? JSON.stringify(metaValues[idx])
                                                        : metaValues[idx]
                                                }
                                                fullwidth
                                            />
                                        );
                                    })}
                                </div>
                            </Collapsible>
                        ) : null}
                    </div>
                </div>
            </DialogLayoutBody>
            <DialogLayoutFooter>
                <div className="flex flex-col gap-2">
                    {isContainedInKiosk && kioskItem?.isLocked ? (
                        <>
                            <Button
                                type={ButtonType.Secondary}
                                onClick={handleMoreAboutKiosk}
                                text="Learn more about Kiosks"
                            />
                            <Button
                                type={ButtonType.Primary}
                                onClick={handleMarketplace}
                                text="Marketplace"
                            />
                        </>
                    ) : (
                        <>
                            {nftBurnFunction && (
                                <Button
                                    fullWidth
                                    type={ButtonType.Destructive}
                                    disabled={isTransactionPending}
                                    text="Burn"
                                    icon={
                                        isTransactionPending ? (
                                            <Loader className="animate-spin" />
                                        ) : undefined
                                    }
                                    iconAfterText
                                    onClick={handleBurnAsset}
                                />
                            )}
                            <Button
                                disabled={!isAssetTransferable}
                                onClick={onSend}
                                text="Send"
                                fullWidth
                            />
                        </>
                    )}
                </div>
            </DialogLayoutFooter>
        </>
    );
}
