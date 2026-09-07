// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { truncateString, useGetObject } from '@iota/core';
import { type IotaMoveNormalizedType } from '@iota/iota-sdk/client';
import { Tooltip, TooltipPosition } from '@iota/apps-ui-kit';
import { SyntaxHighlighter } from '~/components';
import { AddressLink, Link, ObjectLink } from '~/components/ui';
import { getFieldTypeValue } from '~/lib/ui';

interface FieldItemProps {
    value: string | number | object | boolean;
    type: IotaMoveNormalizedType | '';
    objectType: string;
    name?: string;
    truncate?: boolean;
}

const INLINE_VALUE_MAX_LENGTH = 48;
const INLINE_VALUE_SEGMENT_LENGTH = 22;

const TYPE_ADDRESS = 'Address';
const TYPE_URL = '0x2::url::Url';

/** Whether the value fits on a single line, and so does not need an expander. */
export function isInlineFieldValue(value: FieldItemProps['value']): boolean {
    return typeof value !== 'object' || value === null;
}

export function FieldItem({
    value,
    type,
    name,
    truncate = false,
    objectType,
}: FieldItemProps): JSX.Element {
    const isNameId = name
        ?.toLowerCase()
        .split(/[_\s-]/)
        .some((part) => part === 'id' || part === 'uid');

    const objectId = isNameId && typeof value === 'string' ? value : null;

    const { data: objectData } = useGetObject(objectId);

    // for object types, use SyntaxHighlighter
    if (typeof value === 'object') {
        return <SyntaxHighlighter code={JSON.stringify(value, null, 2)} language="json" />;
    }

    const { normalizedType } = getFieldTypeValue(type, objectType);

    if (normalizedType === TYPE_ADDRESS) {
        return (
            <div className="break-all">
                <AddressLink
                    address={value.toString()}
                    noTruncate={!truncate}
                    copyText={value.toString()}
                />
            </div>
        );
    }

    if (objectId && objectData?.data) {
        return (
            <div className="break-all">
                <ObjectLink objectId={objectId} noTruncate={!truncate} copyText={objectId} />
            </div>
        );
    }

    if (normalizedType === TYPE_URL) {
        return (
            <div className="break-all">
                <Link href={value.toString()} variant="textHeroDark">
                    {value}
                </Link>
            </div>
        );
    }

    // In a row a long value would either overflow or be cut mid-word, so it is
    // shortened from the middle and shown in full on hover.
    const text = value === null || value === undefined ? '' : String(value);
    const shouldTruncate = truncate && text.length > INLINE_VALUE_MAX_LENGTH;

    if (shouldTruncate) {
        return (
            <Tooltip text={text} position={TooltipPosition.Left} maxWidth="max-w-[24rem]">
                <div className="break-all text-body-md text-iota-neutral-40">
                    {truncateString(text, INLINE_VALUE_MAX_LENGTH, INLINE_VALUE_SEGMENT_LENGTH)}
                </div>
            </Tooltip>
        );
    }

    return <div className="break-all text-body-md text-iota-neutral-40">{text}</div>;
}
