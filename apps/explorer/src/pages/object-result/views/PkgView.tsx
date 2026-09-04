// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useGetTransaction } from '@iota/core';
import { useState } from 'react';
import { type Direction } from 'react-resizable-panels';

import {
    AddressLink,
    CheckpointSequenceLink,
    DateDisplay,
    EpochLink,
    ErrorBoundary,
    getObjectFilterOptions,
    Link,
    ObjectLink,
    PkgModulesWrapper,
    TransactionBlocksForAddress,
    type TransactionBlocksFilterOption,
} from '~/components';
import { useSearchParamsMerged } from '~/components/ui';
import { usePackageUpgradePolicy } from '~/hooks';
import { getOwnerStr, trimStdLibPrefix } from '~/lib/utils';
import { type DataType } from '../ObjectResultType';
import {
    Badge,
    BadgeSize,
    BadgeType,
    ButtonSegment,
    ButtonSegmentType,
    KeyValueInfo,
    LoadingIndicator,
    Panel,
    SegmentedButton,
    SegmentedButtonType,
    Title,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { UPGRADE_DOCS_URL } from '~/lib';

const GENESIS_TX_DIGEST = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

const SPLIT_PANELS_ORIENTATION: { label: string; value: Direction }[] = [
    { label: 'Stacked', value: 'vertical' },
    { label: 'Side-by-side', value: 'horizontal' },
];

const PACKAGE_CALLS_FILTER = 'package-calls';
const MODULE_CALLS_FILTER = 'module-calls';

interface PkgViewProps {
    data: DataType;
}

export function PkgView({ data }: PkgViewProps): JSX.Element {
    const [selectedSplitPanelOrientation, setSplitPanelOrientation] = useState(
        SPLIT_PANELS_ORIENTATION[1].value,
    );

    const { data: txnData, isPending } = useGetTransaction(data.data.tx_digest!);
    const { upgradePolicy } = usePackageUpgradePolicy(data.data.tx_digest);
    const [searchParams] = useSearchParamsMerged();

    if (isPending) {
        return <LoadingIndicator text="Loading data" />;
    }
    const viewedData = {
        ...data,
        objType: trimStdLibPrefix(data.objType),
        tx_digest: data.data.tx_digest,
        owner: getOwnerStr(data.owner),
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
                <Panel>
                    <Title title="Details" />
                    <div className="grid grid-cols-1 gap-lg p-md--rs md:grid-cols-2">
                        <div className="flex flex-col gap-lg">
                            <KeyValueInfo
                                keyText="Object ID"
                                value={
                                    <div className="flex flex-col gap-xxs">
                                        <ObjectLink
                                            objectId={viewedData.id}
                                            copyText={viewedData.id}
                                        />
                                    </div>
                                }
                            />

                            <KeyValueInfo keyText="Version" value={viewedData.version} />
                            {publisherAddress && (
                                <KeyValueInfo
                                    keyText="Publisher"
                                    value={
                                        <div className="flex flex-col gap-xxs">
                                            <AddressLink
                                                address={publisherAddress}
                                                copyText={publisherAddress}
                                            />
                                        </div>
                                    }
                                />
                            )}
                        </div>
                        <div className="flex flex-col gap-lg">
                            {txnData?.checkpoint && (
                                <KeyValueInfo
                                    keyText="Checkpoint"
                                    value={
                                        <CheckpointSequenceLink sequence={txnData.checkpoint}>
                                            {Number(txnData.checkpoint).toLocaleString()}
                                        </CheckpointSequenceLink>
                                    }
                                />
                            )}
                            {txnData?.effects?.executedEpoch && (
                                <KeyValueInfo
                                    keyText="Epoch"
                                    value={
                                        <EpochLink epoch={txnData.effects.executedEpoch}>
                                            {txnData.effects.executedEpoch}
                                        </EpochLink>
                                    }
                                />
                            )}
                            {txnData?.timestampMs && (
                                <KeyValueInfo
                                    keyText="Date"
                                    value={
                                        <DateDisplay
                                            timestamp={txnData.timestampMs}
                                            type="package"
                                        />
                                    }
                                />
                            )}
                            {upgradePolicy && (
                                <KeyValueInfo
                                    keyText="Upgrade Policy"
                                    tooltipText={
                                        <>
                                            {upgradePolicy.description}{' '}
                                            <Link href={UPGRADE_DOCS_URL} variant="mono">
                                                Read more
                                            </Link>
                                        </>
                                    }
                                    tooltipPosition={TooltipPosition.Bottom}
                                    value={
                                        <Badge
                                            type={
                                                upgradePolicy.isImmutable ||
                                                upgradePolicy.isIndeterminate
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
                    </div>
                </Panel>

                <Panel>
                    <Title
                        title="Modules"
                        trailingElement={
                            <div className="hidden md:flex">
                                <SegmentedButton
                                    type={SegmentedButtonType.Outlined}
                                    shape={ButtonSegmentType.Rounded}
                                >
                                    {SPLIT_PANELS_ORIENTATION.map(({ value, label }) => (
                                        <ButtonSegment
                                            key={value}
                                            type={ButtonSegmentType.Rounded}
                                            onClick={() => setSplitPanelOrientation(value)}
                                            selected={selectedSplitPanelOrientation === value}
                                            label={label}
                                        />
                                    ))}
                                </SegmentedButton>
                            </div>
                        }
                    />
                    <div className="h-full p-md--rs">
                        <ErrorBoundary>
                            <PkgModulesWrapper
                                id={data.id}
                                modules={properties}
                                splitPanelOrientation={selectedSplitPanelOrientation}
                            />
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
