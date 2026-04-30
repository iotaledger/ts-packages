// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Divider,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    KeyValueInfo,
    LoadingIndicator,
    Panel,
    Title,
} from '@iota/apps-ui-kit';
import {
    AddressAlias,
    useCopyToClipboard,
    useGetDefaultIotaName,
    useGetObjectOrPastObject,
} from '@iota/core';
import { formatType, isValidIotaAddress } from '@iota/iota-sdk/utils';
import { useParams } from 'react-router-dom';
import { OwnedObjectsPanel, PageLayout, TransactionBlocksPanel } from '~/components';
import { ObjectLink, PageHeader } from '~/components/ui';
import { useAbstractAccountData } from '~/hooks';
import { isOfficialAuthenticator } from '~/hooks/abstractAccount.utils';
import { Warning } from '@iota/apps-ui-icons';
import { AddressBalanceBreakdown } from '../address-result/AddressBalanceBreakdown';

export function AbstractAccountResultPage(): JSX.Element {
    const { id } = useParams();
    const accountId = id || '';
    const validAccountId = isValidIotaAddress(accountId) ? accountId : null;

    const copyToClipboard = useCopyToClipboard();

    const { data: defaultName, isLoading: isLoadingName } = useGetDefaultIotaName(accountId);
    const {
        data: accountObjectData,
        isPending: isObjectPending,
        isError: isObjectError,
        isFetched: isObjectFetched,
    } = useGetObjectOrPastObject(validAccountId || undefined);

    const {
        isAbstractAccount,
        authenticator,
        isPending: isAbstractAccountDataPending,
        isError: isAbstractAccountDataError,
    } = useAbstractAccountData(validAccountId);

    const isOfficialIotaAuthenticator = isOfficialAuthenticator(authenticator?.packageId ?? null);

    const isNotFound =
        isObjectError || accountObjectData?.error || (isObjectFetched && !accountObjectData?.data);

    let detailsContent: JSX.Element | null = null;

    if (isNotFound) {
        detailsContent = (
            <InfoBox
                title="Invalid Account"
                supportingText={`No account found matching ID: ${accountId} on this network.`}
                icon={<Warning />}
                type={InfoBoxType.Error}
                style={InfoBoxStyle.Elevated}
            />
        );
    } else if (isAbstractAccountDataError) {
        detailsContent = (
            <InfoBox
                title="Failed to Load Abstract Account Data"
                supportingText="The account was found, but its abstract-account metadata could not be loaded right now. Please try again."
                icon={<Warning />}
                type={InfoBoxType.Error}
                style={InfoBoxStyle.Elevated}
            />
        );
    } else if (isObjectPending || isAbstractAccountDataPending) {
        detailsContent = (
            <div className="mt-3 flex w-full justify-center pt-3">
                <LoadingIndicator text="Loading data" />
            </div>
        );
    } else if (!isObjectPending && !isAbstractAccountDataPending) {
        detailsContent = !isAbstractAccount ? (
            <InfoBox
                title="Not an Abstract Account"
                supportingText="This object does not expose an AuthenticatorFunctionRefV1Key dynamic field."
                icon={<Warning />}
                type={InfoBoxType.Error}
                style={InfoBoxStyle.Elevated}
            />
        ) : (
            <>
                <Panel>
                    <Title title="Authenticator" />
                    <Divider />
                    <div className="flex flex-col gap-sm p-md--rs">
                        <KeyValueInfo
                            keyText="Authenticator"
                            value={
                                authenticator?.label && authenticator?.packageId ? (
                                    <ObjectLink
                                        objectId={authenticator.packageId}
                                        copyText={authenticator.label}
                                        label={formatType(authenticator.label)}
                                    />
                                ) : (
                                    authenticator?.label || 'Unknown'
                                )
                            }
                            copyText={authenticator?.label || undefined}
                            isTruncated
                            fullwidth
                        />
                        <KeyValueInfo
                            keyText="Source"
                            value={
                                isOfficialIotaAuthenticator
                                    ? 'Official IOTA Authenticator'
                                    : 'External / Custom'
                            }
                            fullwidth
                        />
                    </div>
                </Panel>

                <AddressBalanceBreakdown address={accountId} />

                <OwnedObjectsPanel address={accountId} />
                <TransactionBlocksPanel address={accountId} />
            </>
        );
    }

    return (
        <PageLayout
            content={
                <div className="flex flex-col gap-2xl">
                    <PageHeader
                        type="Abstract Account"
                        title={
                            <div className="flex flex-col gap-xs">
                                <AddressAlias
                                    address={accountId}
                                    onCopy={() => copyToClipboard(accountId)}
                                />
                            </div>
                        }
                        isLoadingSubtitle={isLoadingName}
                        subtitle={defaultName}
                        showCopyButton={false}
                    />

                    {detailsContent}
                </div>
            }
        />
    );
}
