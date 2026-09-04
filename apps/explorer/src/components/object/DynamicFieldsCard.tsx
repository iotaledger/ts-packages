// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { truncateString, useGetDynamicFields, useOnScreen } from '@iota/core';
import { type DynamicFieldInfo } from '@iota/iota-sdk/client';
import { useRef, useEffect, useState, useMemo } from 'react';
import clsx from 'clsx';
import { UnderlyingObjectCard } from './UnderlyingObjectCard';
import { ObjectLink } from '~/components/ui';
import { EXPANDABLE_FIELD_REGION_CLASSES } from '~/lib/constants';
import {
    Badge,
    BadgeSize,
    BadgeType,
    ButtonUnstyled,
    KeyValueInfo,
    Panel,
    LoadingIndicator,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { ArrowDown } from '@iota/apps-ui-icons';

// Struct keys arrive fully qualified and would push the row's value off screen,
// so they are cut in the middle. The full type stays in the tooltip.
const LABEL_MAX_LENGTH = 44;
const LABEL_SEGMENT_LENGTH = 20;

interface DynamicFieldLabel {
    label: string;
    /** Set when the key is a Move struct, in which case the label is its type. */
    isStructKey: boolean;
    /** Only set when the label had to be cut. */
    fullLabel?: string;
}

function getDynamicFieldLabel(result: DynamicFieldInfo): DynamicFieldLabel {
    const isStructKey = typeof result.name?.value === 'object';
    const text = isStructKey
        ? result.name.type
        : result.name?.value != null
          ? String(result.name.value)
          : result.type;

    return {
        label: truncateString(text, LABEL_MAX_LENGTH, LABEL_SEGMENT_LENGTH),
        isStructKey,
        fullLabel: text.length > LABEL_MAX_LENGTH ? text : undefined,
    };
}

export function DynamicFieldsCard({ id }: { id: string }) {
    const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
        useGetDynamicFields(id);
    const [openFields, setOpenFields] = useState<Record<string, boolean>>({});

    const observerElem = useRef<HTMLDivElement | null>(null);
    const { isIntersecting } = useOnScreen(observerElem);
    const isSpinnerVisible = isFetchingNextPage && hasNextPage;
    const flattenedData = useMemo(() => data?.pages.flatMap((page) => page.data), [data]);

    useEffect(() => {
        if (isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [isIntersecting, fetchNextPage, hasNextPage, isFetchingNextPage]);

    if (isLoading) {
        return (
            <div className="mt-1 flex w-full justify-center">
                <LoadingIndicator />
            </div>
        );
    }

    if (!flattenedData?.length) {
        return (
            <div className="flex justify-center py-md text-body-md text-iota-neutral-40">
                This object has no dynamic fields attached
            </div>
        );
    }

    return (
        <Panel hasBorder>
            <div className="flex flex-col gap-sm p-md--rs">
                {flattenedData.map((result) => {
                    const isExpanded = !!openFields[result.objectId];
                    const detailsId = `dynamic-field-${result.objectId}`;
                    const { label, isStructKey, fullLabel } = getDynamicFieldLabel(result);

                    return (
                        <div key={result.objectId} className="flex flex-col gap-sm">
                            <KeyValueInfo
                                layout="receipt"
                                keyText={label}
                                keyIcon={
                                    isStructKey && (
                                        <div className="mr-xxs shrink-0">
                                            <Badge
                                                type={BadgeType.Neutral}
                                                size={BadgeSize.Small}
                                                label="Struct"
                                            />
                                        </div>
                                    )
                                }
                                tooltipText={fullLabel}
                                tooltipPosition={TooltipPosition.Right}
                                isTruncated
                                value={
                                    <div className="flex flex-row items-center gap-md">
                                        <ObjectLink
                                            objectId={result.objectId}
                                            copyText={result.objectId}
                                        />
                                        <ButtonUnstyled
                                            className="flex shrink-0 items-center text-iota-primary-30 dark:text-iota-primary-80"
                                            aria-controls={detailsId}
                                            aria-expanded={isExpanded}
                                            aria-label={
                                                isExpanded
                                                    ? `Hide ${label} contents`
                                                    : `Show ${label} contents`
                                            }
                                            onClick={() =>
                                                setOpenFields((prev) => ({
                                                    ...prev,
                                                    [result.objectId]: !isExpanded,
                                                }))
                                            }
                                        >
                                            <ArrowDown
                                                className={clsx(
                                                    'h-5 w-5 transition-transform ease-linear',
                                                    isExpanded && 'rotate-180',
                                                )}
                                            />
                                        </ButtonUnstyled>
                                    </div>
                                }
                            />
                            {isExpanded && (
                                <div
                                    id={detailsId}
                                    role="region"
                                    aria-label={`${label} details`}
                                    className={EXPANDABLE_FIELD_REGION_CLASSES}
                                >
                                    <UnderlyingObjectCard
                                        parentId={id}
                                        name={result.name}
                                        dynamicFieldType={result.type}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                <div ref={observerElem}>
                    {isSpinnerVisible ? (
                        <div className="mt-1 flex w-full justify-center">
                            <LoadingIndicator text="Loading data" />
                        </div>
                    ) : null}
                </div>
            </div>
        </Panel>
    );
}
