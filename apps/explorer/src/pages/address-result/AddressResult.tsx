// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
    AddressBalanceHero,
    AddressPageContent,
    IotaNameAddressHeader,
    PageLayout,
    ValidatorAddressHeader,
} from '~/components';
import { PageHeader } from '~/components/ui';
import { IotaLogoMark, Warning } from '@iota/apps-ui-icons';
import {
    AddressAlias,
    ImageIcon,
    ImageIconSize,
    useAddressAliasLookup,
    useCopyToClipboard,
    useGetDefaultIotaName,
} from '@iota/core';
import { isValidIotaName } from '@iota/iota-names-sdk';
import { isValidIotaAddress, trimOrFormatAddress } from '@iota/iota-sdk/utils';
import { useAbstractAccountData, useIotaNameAvatar, useValidatorByAddress } from '~/hooks';
import { InfoBox, InfoBoxType, InfoBoxStyle } from '@iota/apps-ui-kit';

function AddressOrNameResult({ addressOrName }: { addressOrName: string }): JSX.Element {
    const copyToClipboard = useCopyToClipboard();
    const isName = isValidIotaName(addressOrName);
    const { data: resolvedAddress } = useGetDefaultIotaName(isName ? addressOrName : undefined);
    const address = resolvedAddress ?? addressOrName;

    const validator = useValidatorByAddress(address);
    const { name, imageUrl: nameAvatarImageUrl } = useIotaNameAvatar(address, !validator);
    const getAddressAlias = useAddressAliasLookup();
    const knownAddress = !validator && !name ? getAddressAlias(address) : null;

    const identityLabel = validator ? validator.name : (name ?? knownAddress?.alias);
    const identityImageUrl = validator
        ? validator.imageUrl
        : (nameAvatarImageUrl ?? knownAddress?.imageUrl);

    const leading = knownAddress?.isScam ? (
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md ring-1 ring-shader-neutral-light-8 sm:h-24 sm:w-24 dark:ring-shader-neutral-dark-8">
            <Warning className="h-8 w-8 text-iota-neutral-40 dark:text-iota-neutral-60" />
        </div>
    ) : identityImageUrl ? (
        <div className="h-20 w-20 overflow-hidden rounded-md ring-1 ring-shader-neutral-light-8 sm:h-24 sm:w-24 dark:ring-shader-neutral-dark-8 [&>img]:!rounded-md">
            <ImageIcon
                src={identityImageUrl}
                label={identityLabel ?? ''}
                fallback={identityLabel ?? ''}
                size={ImageIconSize.Full}
                fallbackSize={ImageIconSize.Large}
            />
        </div>
    ) : knownAddress ? (
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md ring-1 ring-shader-neutral-light-8 sm:h-24 sm:w-24 dark:ring-shader-neutral-dark-8">
            <IotaLogoMark className="h-1/2 w-1/2 text-iota-neutral-10 dark:text-iota-neutral-92" />
        </div>
    ) : undefined;

    return (
        <>
            {knownAddress?.isScam && (
                <InfoBox
                    title="Scam Warning"
                    supportingText="This user account has been involved in fraudulent activities. Exercise caution when interacting with it to avoid potential scams or deceitful practices."
                    icon={<Warning />}
                    type={InfoBoxType.Error}
                    style={InfoBoxStyle.Elevated}
                />
            )}
            <PageHeader
                type="Address"
                leading={leading}
                title={
                    <div className="flex flex-col gap-xs">
                        {validator ? (
                            <ValidatorAddressHeader validator={validator} />
                        ) : name ? (
                            <IotaNameAddressHeader name={name} />
                        ) : knownAddress ? (
                            <span className="text-headline-sm text-iota-neutral-10 dark:text-iota-neutral-92">
                                {knownAddress.alias}
                            </span>
                        ) : null}
                        <AddressAlias
                            address={address}
                            onCopy={() => copyToClipboard(address)}
                            hideAlias={!!validator || !!name || !!knownAddress}
                            renderAddress={(addressToDisplay, copyButton) => (
                                <>
                                    <span className="whitespace-nowrap sm:hidden">
                                        {trimOrFormatAddress(addressToDisplay)}
                                        {copyButton}
                                    </span>
                                    <span className="hidden sm:inline">
                                        {addressToDisplay.slice(0, -4)}
                                        <span className="whitespace-nowrap">
                                            {addressToDisplay.slice(-4)}
                                            {copyButton}
                                        </span>
                                    </span>
                                </>
                            )}
                        />
                    </div>
                }
                subtitle={null}
                showCopyButton={false}
                contentWidthClassName="md:w-3/5"
                afterWidthClassName="md:w-2/5"
                rowAlignClassName="md:items-stretch"
                rowGapClassName="gap-lg md:gap-sm"
                after={<AddressBalanceHero address={address} />}
            />
            <AddressPageContent address={address} />
        </>
    );
}

export function AddressResultPage(): JSX.Element {
    const { id } = useParams();
    const { search } = useLocation();
    const isAddressInput = isValidIotaAddress(id || '');
    const { isAbstractAccount, isPending } = useAbstractAccountData(isAddressInput ? id : null);

    if (isAddressInput && !isPending && isAbstractAccount) {
        return <Navigate to={`/account/${id}${search}`} replace />;
    }

    return (
        <PageLayout
            content={
                <div className="flex flex-col gap-2xl">
                    <AddressOrNameResult addressOrName={id!} />
                </div>
            }
        />
    );
}
