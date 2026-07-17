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
import {
    AddressAlias,
    ImageIcon,
    ImageIconSize,
    useCopyToClipboard,
    useGetDefaultIotaName,
} from '@iota/core';
import { isValidIotaName } from '@iota/iota-names-sdk';
import { isValidIotaAddress, trimOrFormatAddress } from '@iota/iota-sdk/utils';
import { useAbstractAccountData, useIotaNameAvatar, useValidatorByAddress } from '~/hooks';

function AddressOrNameResult({ addressOrName }: { addressOrName: string }): JSX.Element {
    const copyToClipboard = useCopyToClipboard();
    const isName = isValidIotaName(addressOrName);
    const { data: resolvedAddress } = useGetDefaultIotaName(isName ? addressOrName : undefined);
    const address = resolvedAddress ?? addressOrName;

    const { data: name } = useGetDefaultIotaName(address);
    const validator = useValidatorByAddress(address);
    const { imageUrl: nameAvatarImageUrl } = useIotaNameAvatar(address, validator ? null : name);

    const identityLabel = validator ? validator.name : name;
    const identityImageUrl = validator ? validator.imageUrl : nameAvatarImageUrl;

    const leading =
        validator || name ? (
            <div className="h-16 w-16 overflow-hidden rounded-full ring-1 ring-shader-neutral-light-8 sm:h-20 sm:w-20 dark:ring-shader-neutral-dark-8">
                <ImageIcon
                    src={identityImageUrl}
                    label={identityLabel ?? ''}
                    fallback={identityLabel ?? ''}
                    size={ImageIconSize.Full}
                    fallbackSize={ImageIconSize.Large}
                />
            </div>
        ) : undefined;

    return (
        <>
            <PageHeader
                type="Address"
                leading={leading}
                title={
                    <div className="flex flex-col gap-xs">
                        {validator ? (
                            <ValidatorAddressHeader validator={validator} />
                        ) : name ? (
                            <IotaNameAddressHeader name={name} />
                        ) : null}
                        <AddressAlias
                            address={address}
                            onCopy={() => copyToClipboard(address)}
                            hideAlias={!!validator || !!name}
                            renderAddress={(addressToDisplay) => (
                                <>
                                    <span className="sm:hidden">
                                        {trimOrFormatAddress(addressToDisplay)}
                                    </span>
                                    <span className="hidden sm:inline">{addressToDisplay}</span>
                                </>
                            )}
                        />
                    </div>
                }
                subtitle={null}
                showCopyButton={false}
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
