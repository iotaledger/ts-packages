// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    ButtonSegment,
    ButtonSegmentType,
    SegmentedButton,
    SegmentedButtonType,
    Tooltip,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { useGetDynamicFields, useGetObjectOrPastObject } from '@iota/core';
import { useIotaClientQuery } from '@iota/dapp-kit';
import { type IotaObjectResponse } from '@iota/iota-sdk/client';
import { useState } from 'react';
import { DynamicFieldsCard, ObjectFieldsCard, TransactionBlocksForAddress } from '~/components';

function useObjectFieldsCard(id: string) {
    const { data: iotaObjectResponseData, isPending, isError } = useGetObjectOrPastObject(id);

    const objectType =
        (iotaObjectResponseData?.data?.type ??
        iotaObjectResponseData?.data?.content?.dataType === 'package')
            ? iotaObjectResponseData.data.type
            : iotaObjectResponseData?.data?.content?.type;

    const [packageId, moduleName, functionName] = objectType?.split('<')[0]?.split('::') || [];

    // Get the normalized struct for the object
    const {
        data: normalizedStructData,
        isLoading: loadingNormalizedStruct,
        isError: errorNormalizedMoveStruct,
    } = useIotaClientQuery(
        'getNormalizedMoveStruct',
        {
            package: packageId,
            module: moduleName,
            struct: functionName,
        },
        {
            enabled: !!packageId && !!moduleName && !!functionName,
        },
    );

    return {
        loading: isPending || loadingNormalizedStruct,
        isError: isError || errorNormalizedMoveStruct,
        normalizedStructData,
        iotaObjectResponseData,
        objectType,
    };
}

interface FieldsContentProps {
    objectId: string;
}

enum FieldCategory {
    Fields = 'fields',
    Dynamic = 'dynamicFields',
}

export function FieldsContent({ objectId }: FieldsContentProps) {
    const {
        normalizedStructData,
        iotaObjectResponseData,
        objectType,
        loading: objectFieldsCardLoading,
        isError: objectFieldsCardError,
    } = useObjectFieldsCard(objectId);

    const { data: dynamicFieldsData } = useGetDynamicFields(objectId);
    const hasDynamicFields = !!dynamicFieldsData?.pages?.[0]?.data.length;

    const fieldsCount = normalizedStructData?.fields.length;
    const FIELDS_CATEGORIES = [
        {
            label: `${fieldsCount !== undefined ? `${fieldsCount} ` : ''}Fields`,
            value: FieldCategory.Fields,
        },
        {
            label: 'Dynamic Fields',
            value: FieldCategory.Dynamic,
            disabled: !hasDynamicFields,
            disabledTooltip: 'This object has no dynamic fields attached',
        },
    ];

    const [activeTab, setActiveTab] = useState<string>(FieldCategory.Fields);

    return (
        <div>
            <SegmentedButton
                type={SegmentedButtonType.Transparent}
                shape={ButtonSegmentType.Underlined}
            >
                {FIELDS_CATEGORIES.map(({ label, value, disabled, disabledTooltip }) => {
                    const segment = (
                        <ButtonSegment
                            key={value}
                            onClick={() => setActiveTab(value)}
                            label={label}
                            selected={activeTab === value}
                            type={ButtonSegmentType.Underlined}
                            disabled={disabled}
                        />
                    );

                    if (!disabled || !disabledTooltip) {
                        return segment;
                    }

                    // A disabled button swallows hover events, so the tooltip
                    // has to be triggered by its wrapper instead.
                    return (
                        <Tooltip
                            key={value}
                            text={disabledTooltip}
                            position={TooltipPosition.Bottom}
                        >
                            <div className="[&>button]:pointer-events-none">{segment}</div>
                        </Tooltip>
                    );
                })}
            </SegmentedButton>
            <div className="flex flex-col gap-5 p-md">
                {activeTab === FieldCategory.Fields && (
                    <ObjectFieldsCard
                        objectType={objectType || ''}
                        normalizedStructData={normalizedStructData}
                        iotaObjectResponseData={iotaObjectResponseData}
                        loading={objectFieldsCardLoading}
                        error={objectFieldsCardError}
                        id={objectId}
                    />
                )}
                {activeTab === FieldCategory.Dynamic && <DynamicFieldsCard id={objectId} />}
            </div>
        </div>
    );
}

interface TokenViewProps {
    data: IotaObjectResponse;
}

export function TokenView({ data }: TokenViewProps): JSX.Element {
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    const objectId = data.data?.objectId!;

    return (
        <div className="flex flex-col gap-y-2xl">
            <FieldsContent objectId={objectId} />
            <TransactionBlocksForAddress address={objectId} header="Transaction Blocks" />
        </div>
    );
}
