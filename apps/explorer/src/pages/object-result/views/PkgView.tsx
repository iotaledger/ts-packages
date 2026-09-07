// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useGetTransaction } from '@iota/core';
import {
    AddressLink,
    CheckpointSequenceLink,
    DateDisplay,
    EpochLink,
    ErrorBoundary,
    getObjectFilterOptions,
    Link,
    ObjectLink,
    OwnerDisplay,
    PackageVersionsList,
    PkgModulesWrapper,
    TransactionBlocksForAddress,
    type TransactionBlocksFilterOption,
} from '~/components';
import { useSearchParamsMerged } from '~/components/ui';
import { usePackageUpgradePolicy, usePackageVersions } from '~/hooks';
import { trimStdLibPrefix } from '~/lib/utils';
import { type DataType } from '../ObjectResultType';
import {
    Badge,
    BadgeSize,
    BadgeType,
    ButtonUnstyled,
    DisplayStats,
    LoadingIndicator,
    Panel,
    Title,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { ArrowDown } from '@iota/apps-ui-icons';
import cx from 'clsx';
import { useState } from 'react';
import { OBJECT_FIELD_TOOLTIP, UPGRADE_DOCS_URL } from '~/lib';

const GENESIS_TX_DIGEST = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

const PACKAGE_CALLS_FILTER = 'package-calls';
const MODULE_CALLS_FILTER = 'module-calls';

interface PkgViewProps {
    data: DataType;
}

export function PkgView({ data }: PkgViewProps): JSX.Element {
    const { data: txnData, isPending } = useGetTransaction(data.data.tx_digest!);
    const { upgradePolicy } = usePackageUpgradePolicy(data.data.tx_digest);
    const [searchParams] = useSearchParamsMerged();
    const [isVersionsExpanded, setIsVersionsExpanded] = useState(false);
    const { data: packageVersions } = usePackageVersions(data.id);

    // Nothing to say about a package that was never upgraded: its version is
    // already on the card above.
    const showVersions = !!packageVersions && (packageVersions.length > 1 || data.version !== '1');

    if (isPending) {
        return <LoadingIndicator text="Loading data" />;
    }
    const viewedData = {
        ...data,
        objType: trimStdLibPrefix(data.objType),
        tx_digest: data.data.tx_digest,
        publisherAddress:
            data.data.tx_digest === GENESIS_TX_DIGEST
                ? 'Genesis'
                : txnData?.transaction?.data.sender,
    };

    const filterProperties = (
        entry: [string, unknown],
    ): entry is [string, number] | [string, string] =>
        ['number', 'string'].includes(typeof entry[1]);

    const mapProperties = ([key, value]: [string, number] | [string, string]): [string, string] => [
        key,
        value.toString(),
    ];

    const properties = Object.entries(viewedData.data.contents ?? {})
        .filter(([key, _]) => key !== 'name')
        .filter(filterProperties)
        .map(mapProperties);

    const publisherAddress = viewedData.publisherAddress;

    // Mirrors the module PkgModulesWrapper shows, so the calls table follows
    // whichever module the user is reading.
    const moduleNameValue = searchParams.get('module');
    const selectedModuleName =
        properties.find(([moduleName]) => moduleName === moduleNameValue)?.[0] ??
        properties[0]?.[0];

    const packageCallsOption: TransactionBlocksFilterOption = {
        label: 'Calls',
        value: PACKAGE_CALLS_FILTER,
        filter: { MoveFunction: { package: viewedData.id } },
    };

    const moduleCallsOption: TransactionBlocksFilterOption | null = selectedModuleName
        ? {
              label: `Calls: ${selectedModuleName}`,
              value: MODULE_CALLS_FILTER,
              filter: {
                  MoveFunction: { package: viewedData.id, module: selectedModuleName },
              },
          }
        : null;

    const transactionFilterOptions: TransactionBlocksFilterOption[] = [
        packageCallsOption,
        ...(moduleCallsOption ? [moduleCallsOption] : []),
        ...getObjectFilterOptions(viewedData.id),
    ];

    return (
        <div>
            <div className="flex flex-col gap-2xl">
                <div className="grid grid-cols-1 gap-md--rs sm:grid-cols-2 lg:grid-cols-4">
                    <DisplayStats
                        label="Object ID"
                        tooltipText={OBJECT_FIELD_TOOLTIP.objectId}
                        tooltipPosition={TooltipPosition.Top}
                        value={<ObjectLink objectId={viewedData.id} copyText={viewedData.id} />}
                    />
                    <DisplayStats
                        label="Version"
                        tooltipText={OBJECT_FIELD_TOOLTIP.version}
                        tooltipPosition={TooltipPosition.Top}
                        value={viewedData.version}
                    />
                    {publisherAddress && (
                        <DisplayStats
                            label="Publisher"
                            tooltipText={OBJECT_FIELD_TOOLTIP.publisher}
                            tooltipPosition={TooltipPosition.Top}
                            value={
                                <AddressLink
                                    address={publisherAddress}
                                    copyText={publisherAddress}
                                />
                            }
                        />
                    )}
                    {data.owner && (
                        <DisplayStats
                            label="Owner"
                            tooltipText={OBJECT_FIELD_TOOLTIP.owner}
                            tooltipPosition={TooltipPosition.Top}
                            value={<OwnerDisplay objOwner={data.owner} />}
                        />
                    )}
                    {txnData?.checkpoint && (
                        <DisplayStats
                            label="Checkpoint"
                            value={
                                <CheckpointSequenceLink sequence={txnData.checkpoint}>
                                    {Number(txnData.checkpoint).toLocaleString()}
                                </CheckpointSequenceLink>
                            }
                        />
                    )}
                    {txnData?.effects?.executedEpoch && (
                        <DisplayStats
                            label="Epoch"
                            value={
                                <EpochLink epoch={txnData.effects.executedEpoch}>
                                    {txnData.effects.executedEpoch}
                                </EpochLink>
                            }
                        />
                    )}
                    {txnData?.timestampMs && (
                        <DisplayStats
                            label="Published"
                            tooltipText={OBJECT_FIELD_TOOLTIP.published}
                            tooltipPosition={TooltipPosition.Top}
                            value={<DateDisplay timestamp={txnData.timestampMs} type="package" />}
                        />
                    )}
                    {upgradePolicy && (
                        <DisplayStats
                            label="Upgrade Policy"
                            tooltipText={
                                <>
                                    {upgradePolicy.description}{' '}
                                    <Link href={UPGRADE_DOCS_URL} variant="mono">
                                        Read more
                                    </Link>
                                </>
                            }
                            tooltipPosition={TooltipPosition.Top}
                            value={
                                <Badge
                                    type={
                                        upgradePolicy.isImmutable || upgradePolicy.isIndeterminate
                                            ? BadgeType.Neutral
                                            : BadgeType.PrimarySoft
                                    }
                                    size={BadgeSize.Small}
                                    label={upgradePolicy.label}
                                />
                            }
                        />
                    )}
                </div>

                {showVersions && (
                    <Panel>
                        <Title
                            title="Versions"
                            trailingElement={
                                <ButtonUnstyled
                                    className="flex flex-row items-center gap-xxxs pr-md--rs text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                                    aria-controls="package-versions"
                                    aria-expanded={isVersionsExpanded}
                                    onClick={() => setIsVersionsExpanded((expanded) => !expanded)}
                                >
                                    {isVersionsExpanded ? 'Show Less' : 'Show More'}
                                    <ArrowDown
                                        className={cx(
                                            'h-4 w-4 transition-transform ease-linear',
                                            isVersionsExpanded && 'rotate-180',
                                        )}
                                    />
                                </ButtonUnstyled>
                            }
                        />
                        {isVersionsExpanded && (
                            <div id="package-versions" className="p-md--rs">
                                <PackageVersionsList packageId={viewedData.id} />
                            </div>
                        )}
                    </Panel>
                )}

                <Panel>
                    <Title title="Modules" />
                    <div className="h-full p-md--rs">
                        <ErrorBoundary>
                            <PkgModulesWrapper id={data.id} modules={properties} />
                        </ErrorBoundary>
                    </div>
                </Panel>

                <ErrorBoundary>
                    <TransactionBlocksForAddress
                        address={viewedData.id}
                        filter={PACKAGE_CALLS_FILTER}
                        header="Transaction Blocks"
                        options={transactionFilterOptions}
                    />
                </ErrorBoundary>
            </div>
        </div>
    );
}
