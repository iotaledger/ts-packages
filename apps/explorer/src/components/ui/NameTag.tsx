// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { AddressAliasIcon, useAddressAlias } from '@iota/core';
import { AddressLink, ObjectLink } from './InternalLink';

interface NameTagProps {
    id: string;
    isObject?: boolean;
    label?: string;
    queryStrings?: Record<string, string>;
    copyable?: boolean;
}

export function NameTag({
    id,
    isObject,
    label,
    queryStrings,
    copyable,
}: NameTagProps): JSX.Element {
    const { addressAlias } = useAddressAlias({ address: id });

    const linkProps = {
        label,
        queryStrings,
        copyText: copyable ? id : undefined,
        showAddressAlias: addressAlias ? false : undefined,
    };
    const link = isObject ? (
        <ObjectLink objectId={id} {...linkProps} />
    ) : (
        <AddressLink address={id} {...linkProps} />
    );

    if (!addressAlias) {
        return link;
    }

    return (
        <span className="inline-flex items-center gap-x-xs text-iota-neutral-40 dark:text-iota-neutral-60">
            <AddressAliasIcon addressAlias={addressAlias} />
            <span>{addressAlias.alias}</span>
            {link}
        </span>
    );
}
