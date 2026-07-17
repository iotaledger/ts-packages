// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
    AddressBalanceHero,
    AddressPageContent,
    PageLayout,
    ValidatorAddressHeader,
} from '~/components';
import { PageHeader } from '~/components/ui';
import { AddressAlias, useCopyToClipboard, useGetDefaultIotaName } from '@iota/core';
import { isValidIotaName } from '@iota/iota-names-sdk';
import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import { useAbstractAccountData, useValidatorByAddress } from '~/hooks';

function AddressOrNameResult({ addressOrName }: { addressOrName: string }): JSX.Element {
    const copyToClipboard = useCopyToClipboard();
    const isName = isValidIotaName(addressOrName);
    const { data: resolvedAddress } = useGetDefaultIotaName(isName ? addressOrName : undefined);
    const address = resolvedAddress ?? addressOrName;

    const { data: name, isLoading: isLoadingName } = useGetDefaultIotaName(address);
    const validator = useValidatorByAddress(address);

    return (
        <>
            <PageHeader
                type="Address"
                title={
                    <div className="flex flex-col gap-xs">
                        {validator && <ValidatorAddressHeader validator={validator} />}
                        <AddressAlias
                            address={address}
                            onCopy={() => copyToClipboard(address)}
                            hideAlias={!!validator}
                        />
                    </div>
                }
                isLoadingSubtitle={!validator && isLoadingName}
                subtitle={validator ? null : name}
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
