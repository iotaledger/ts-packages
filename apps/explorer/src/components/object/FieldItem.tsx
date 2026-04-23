// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type IotaMoveNormalizedType } from '@iota/iota-sdk/client';
import { SyntaxHighlighter } from '~/components';
import { AddressLink, Link, ObjectLink } from '~/components/ui';
import { getFieldTypeValue } from '~/lib/ui';

interface FieldItemProps {
    value: string | number | object | boolean;
    type: IotaMoveNormalizedType | '';
    objectType: string;
    truncate?: boolean;
}

const TYPE_ADDRESS = 'Address';
const TYPE_URL = '0x2::url::Url';
const TYPE_OBJECT_ID = ['0x2::object::UID', '0x2::object::ID'];

export function FieldItem({
    value,
    type,
    truncate = false,
    objectType,
}: FieldItemProps): JSX.Element {
    const { normalizedType } = getFieldTypeValue(type, objectType);
    const isIdType =
        typeof normalizedType === 'string' &&
        TYPE_OBJECT_ID.some((t) => normalizedType.toLowerCase() === t.toLowerCase());

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

    if (isIdType) {
        const obj = value as Record<string, unknown>;
        const objectId =
            typeof value === 'string'
                ? value
                : typeof obj.id === 'string'
                  ? obj.id
                  : typeof obj.bytes === 'string'
                    ? obj.bytes
                    : null;
        if (objectId) {
            return (
                <div className="break-all">
                    <ObjectLink objectId={objectId} noTruncate={!truncate} copyText={objectId} />
                </div>
            );
        }
    }

    // for object types, use SyntaxHighlighter
    if (typeof value === 'object') {
        return <SyntaxHighlighter code={JSON.stringify(value, null, 2)} language="json" />;
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
