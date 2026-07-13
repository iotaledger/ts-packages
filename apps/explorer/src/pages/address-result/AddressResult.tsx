// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Navigate, useLocation, useParams } from 'react-router-dom';
import { AddressPageContent, PageLayout } from '~/components';
import { PageHeader } from '~/components/ui';
import { AddressAlias, useCopyToClipboard, useGetDefaultIotaName } from '@iota/core';
import { AddressBalanceHero, AddressBalanceTiles } from './AddressBalance';
import { isValidIotaName } from '@iota/iota-names-sdk';
import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import { useAbstractAccountData, useAddressBalanceSummary } from '~/hooks';

interface AddressResultPageHeaderProps {
    address: string;
}

function AddressResultPageHeader({ address }: AddressResultPageHeaderProps): React.JSX.Element {
    const copyToClipboard = useCopyToClipboard();
    const { data: name, isLoading: isLoadingName } = useGetDefaultIotaName(address);
    const balanceSummary = useAddressBalanceSummary(address);

    return (
        <PageHeader
            type="Address"
            title={
                <div className="flex flex-col gap-xs">
                    <AddressAlias address={address} onCopy={() => copyToClipboard(address)} />
                </div>
            }
            isLoadingSubtitle={isLoadingName}
            subtitle={name}
            showCopyButton={false}
            after={<AddressBalanceHero summary={balanceSummary} />}
            bottom={<AddressBalanceTiles summary={balanceSummary} />}
        />
    );
}

function AddressOrNameResult({ addressOrName }: { addressOrName: string }): JSX.Element {
    const isName = isValidIotaName(addressOrName);
    const { data } = useGetDefaultIotaName(isName ? addressOrName : undefined);

    return <AddressPageContent address={data ?? addressOrName} />;
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
                    <AddressResultPageHeader address={id!} />
                    <AddressOrNameResult addressOrName={id!} />
                </div>
            }
        />
    );
}
