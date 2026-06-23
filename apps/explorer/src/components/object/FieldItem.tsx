// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useGetObject } from '@iota/core';
import { type IotaMoveNormalizedType } from '@iota/iota-sdk/client';
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

const TYPE_ADDRESS = 'Address';
const TYPE_URL = '0x2::url::Url';

export function FieldItem({
    value,
    type,
    name,
    truncate = false,
    objectType,
}: FieldItemProps): JSX.Element {
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

    const isNameId = name
        ?.toLowerCase()
        .split(/[_\s-]/)
        .some((part) => part === 'id' || part === 'uid');

    const objectId = isNameId && typeof value === 'string' ? value : null;

    const { data: objectData } = useGetObject(objectId);

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

    return (
        <div className="break-all text-body-md text-iota-neutral-40">
            {value === null || value === undefined ? null : String(value)}
        </div>
    );
}
