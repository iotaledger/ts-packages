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

    if (TYPE_OBJECT_ID.includes(normalizedType as string) && (value as Record<string, string>).id) {
        const { id } = value as Record<string, string>;
        return (
            <div className="break-all">
                <ObjectLink objectId={id} noTruncate={!truncate} copyText={id} />
            </div>
        );
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
