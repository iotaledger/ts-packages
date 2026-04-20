// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import { Badge, BadgeType, KeyValueInfo, Panel } from '@iota/apps-ui-kit';
import { type IotaValidatorSummary } from '@iota/iota-sdk/client';
import { ArrowTopRight, IotaLogoMark } from '@iota/apps-ui-icons';
import { AddressLink } from '~/components/ui';
import { ImageIcon, ImageIconSize, useIsValidatorCommitteeMember } from '@iota/core';
import type { ValidatorOverviewData } from '@iota/core/src/types';
import { onCopySuccess } from '~/lib/utils';

type ValidatorMetaProps = {
    validatorData: IotaValidatorSummary | ValidatorOverviewData;
    atRiskRemainingEpochs?: number | null;
    isCandidate?: boolean;
    isPending?: boolean;
    isInactive?: boolean;
};

export function ValidatorMeta({
    validatorData,
    atRiskRemainingEpochs,
    isCandidate,
    isPending,
    isInactive,
}: ValidatorMetaProps): JSX.Element {
    const validatorPublicKey = validatorData.protocolPubkeyBytes;
    const validatorName = validatorData.name;
    const logo = validatorData.imageUrl;
    const description = validatorData.description;
    const projectUrl = validatorData.projectUrl;
    const validatorAddress = validatorData.iotaAddress;
    const stakingPoolId = validatorData.stakingPoolId;
    const { isCommitteeMember } = useIsValidatorCommitteeMember();
    const isValidatorCommitteeMember = isCommitteeMember(validatorAddress);

    return (
        <div className="flex flex-col gap-md md:flex-row">
            <div className="flex w-full md:w-2/5">
                <Panel>
                    <div className="flex flex-col gap-lg p-md--rs">
                        <div className="flex flex-row gap-lg">
                            <div className="h-[80px] w-[80px] shrink-0">
                                <ImageIcon
                                    src={logo}
                                    label={validatorName}
                                    fallback={validatorName}
                                    size={ImageIconSize.Full}
                                />
                            </div>
                            <div className="flex min-w-0 flex-col gap-sm">
                                <div className="flex flex-row items-center gap-x-sm gap-y-xs">
                                    <span className="text-headline-md text-iota-neutral-10 dark:text-iota-neutral-92">
                                        {validatorName}
                                    </span>
                                    {projectUrl && (
                                        <a
                                            href={projectUrl}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="text-iota-neutral-40 hover:text-iota-neutral-10 dark:text-iota-neutral-60 dark:hover:text-iota-neutral-92"
                                        >
                                            <ArrowTopRight />
                                        </a>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-xs">
                                    <Badge type={BadgeType.Neutral} label="Validator" />
                                    {isValidatorCommitteeMember ? (
                                        <Badge type={BadgeType.Success} label="Committee" />
                                    ) : isCandidate ? (
                                        <Badge type={BadgeType.Neutral} label="Candidate" />
                                    ) : isPending ? (
                                        <Badge type={BadgeType.Warning} label="Pending" />
                                    ) : isInactive ? (
                                        <Badge type={BadgeType.Outlined} label="Inactive" />
                                    ) : (
                                        <Badge type={BadgeType.PrimarySoft} label="Active" />
                                    )}
                                    {atRiskRemainingEpochs != null && (
                                        <Badge type={BadgeType.Error} label="At Risk" />
                                    )}
                                </div>
                            </div>
                        </div>
                        {description && (
                            <p className="text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                                {description}
                            </p>
                        )}
                    </div>
                </Panel>
            </div>

            <Panel>
                <div className="flex flex-col gap-md p-md--rs">
                    <KeyValueInfo
                        keyText="Address"
                        value={
                            <div className="flex flex-col gap-xxs">
                                <div className="flex items-center gap-xs text-iota-neutral-40 dark:text-iota-neutral-60">
                                    <IotaLogoMark className="h-3.5 w-3.5 shrink-0" />
                                    <span className="text-body-sm">{validatorName}</span>
                                </div>
                                <AddressLink
                                    address={validatorAddress}
                                    copyText={validatorAddress}
                                    noTruncate
                                    showAddressAlias={false}
                                />
                            </div>
                        }
                    />
                    <KeyValueInfo
                        keyText="Pool ID"
                        value={stakingPoolId}
                        copyText={stakingPoolId}
                        onCopySuccess={onCopySuccess}
                    />
                    <KeyValueInfo
                        keyText="Public Key"
                        value={validatorPublicKey}
                        copyText={validatorPublicKey}
                        onCopySuccess={onCopySuccess}
                    />
                </div>
            </Panel>
        </div>
    );
}
