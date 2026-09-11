// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaMoveNormalizedStruct, type IotaObjectResponse } from '@iota/iota-sdk/client';
import clsx from 'clsx';
import { useCallback, useEffect, useState } from 'react';
import { useBreakpoint } from '~/hooks/useBreakpoint';
import { getFieldTypeValue } from '~/lib/ui';
import { FieldItem, isInlineFieldValue } from './FieldItem';
import {
    ButtonUnstyled,
    KeyValueInfo,
    Panel,
    LoadingIndicator,
    Search,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
} from '@iota/apps-ui-kit';
import { ArrowDown, Warning } from '@iota/apps-ui-icons';

const DEFAULT_FIELDS_COUNT_TO_SHOW_SEARCH = 10;

interface ObjectFieldsProps {
    id: string;
    normalizedStructData?: IotaMoveNormalizedStruct;
    iotaObjectResponseData?: IotaObjectResponse | null;
    loading: boolean;
    error: boolean;
    objectType?: string;
}

export function ObjectFieldsCard({
    id,
    normalizedStructData,
    iotaObjectResponseData,
    loading,
    error,
    objectType,
}: ObjectFieldsProps): JSX.Element | null {
    const [query, setQuery] = useState('');
    const isMediumOrAbove = useBreakpoint('md');
    const [openFieldsName, setOpenFieldsName] = useState<{
        [name: string]: boolean;
    }>({});

    const fieldsData =
        iotaObjectResponseData?.data?.content?.dataType === 'moveObject'
            ? (iotaObjectResponseData?.data?.content?.fields as Record<
                  string,
                  string | number | object
              >)
            : null;

    useEffect(() => {
        setOpenFieldsName({});
    }, [normalizedStructData?.fields]);

    const onSetOpenFieldsName = useCallback(
        (name: string) => (open: boolean) => {
            setOpenFieldsName((prev) => ({
                ...prev,
                [name]: open,
            }));
        },
        [],
    );

    if (loading) {
        return (
            <div className="flex w-full justify-center">
                <LoadingIndicator text="Loading data" />
            </div>
        );
    }
    if (error) {
        return (
            <InfoBox
                title="Error loading data"
                supportingText={`Failed to get field data for ${id}`}
                icon={<Warning />}
                type={InfoBoxType.Error}
                style={InfoBoxStyle.Elevated}
            />
        );
    }

    if (!fieldsData || !normalizedStructData?.fields || !objectType) {
        return null;
    }

    const filteredFields =
        query === ''
            ? normalizedStructData.fields
            : normalizedStructData.fields.filter(({ name }) =>
                  name.toLowerCase().includes(query.toLowerCase()),
              );

    const renderSearchBar =
        normalizedStructData?.fields.length >= DEFAULT_FIELDS_COUNT_TO_SHOW_SEARCH;

    return (
        <Panel hasBorder>
            <div className="flex flex-col gap-sm p-md--rs">
                {renderSearchBar && (
                    <div className="pb-xs">
                        <Search
                            searchValue={query}
                            onSearchValueChange={(value) => setQuery(value?.trim() ?? '')}
                            placeholder="Search fields"
                            isLoading={false}
                        />
                    </div>
                )}

                {filteredFields.map(({ name, type }) => {
                    const value = fieldsData[name];
                    const isInline = isInlineFieldValue(value);
                    const isExpanded = !!openFieldsName[name];
                    const detailsId = `object-field-${name}`;
                    const { displayName } = getFieldTypeValue(type, objectType);

                    return (
                        <div key={name} className="flex flex-col gap-sm">
                            <KeyValueInfo
                                layout="receipt"
                                fullwidth={!isMediumOrAbove}
                                keyText={
                                    <>
                                        {name}
                                        {displayName && (
                                            <span className="pl-xxs text-iota-neutral-60 dark:text-iota-neutral-40">
                                                ({displayName})
                                            </span>
                                        )}
                                    </>
                                }
                                value={
                                    isInline ? (
                                        <FieldItem
                                            value={value}
                                            objectType={objectType}
                                            type={type}
                                            name={name}
                                            truncate
                                        />
                                    ) : (
                                        <ButtonUnstyled
                                            className="flex flex-row items-center gap-xxxs text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                                            aria-controls={detailsId}
                                            aria-expanded={isExpanded}
                                            onClick={() => onSetOpenFieldsName(name)(!isExpanded)}
                                        >
                                            {isExpanded ? 'Show Less' : 'Show More'}
                                            <ArrowDown
                                                className={clsx(
                                                    'h-4 w-4 transition-transform ease-linear',
                                                    isExpanded && 'rotate-180',
                                                )}
                                            />
                                        </ButtonUnstyled>
                                    )
                                }
                            />
                            {!isInline && isExpanded && (
                                <div
                                    id={detailsId}
                                    role="region"
                                    aria-label={`${name} details`}
                                    className="ml-xs flex min-w-0 flex-col gap-md overflow-x-auto border-x border-iota-neutral-92 px-md py-md dark:border-iota-neutral-12"
                                >
                                    <FieldItem
                                        value={value}
                                        objectType={objectType}
                                        type={type}
                                        name={name}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                {!filteredFields.length && (
                    <div className="flex justify-center py-md text-body-md text-iota-neutral-40">
                        No fields match the search
                    </div>
                )}
            </div>
        </Panel>
    );
}
