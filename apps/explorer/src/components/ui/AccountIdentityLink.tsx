// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { ComponentProps, ReactNode } from 'react';
import { ImageIcon, ImageIconSize } from '@iota/core';
import { IotaLogoMark } from '@iota/apps-ui-icons';
import { formatAddress, normalizeIotaAddress } from '@iota/iota-sdk/utils';
import { useValidatorByAddress } from '~/hooks';
import { AddressLink } from './InternalLink';

// All system transactions are signed by the zero address.
const ZERO_ADDRESS = normalizeIotaAddress('0x0');

type AccountIdentityLinkProps = Omit<ComponentProps<typeof AddressLink>, 'label'>;

function IdentityLabel({ name, imageUrl }: { name: string; imageUrl?: string | null }): ReactNode {
    return (
        <div className="flex items-center gap-x-xs text-iota-neutral-40 dark:text-iota-neutral-60">
            <div className="h-5 w-5 shrink-0">
                <ImageIcon
                    src={imageUrl}
                    label={name}
                    fallback={name}
                    size={ImageIconSize.Small}
                    rounded
                />
            </div>
            <span className="truncate text-label-lg">{name}</span>
        </div>
    );
}

/**
 * An `AddressLink` that resolves known identities for the address: validator name and logo, or
 * the IOTA logo next to the truncated address for the zero address (system transactions). Falls
 * back to the plain `AddressLink` (which resolves IOTA Names as the link text itself), also
 * while the validator lookup is still loading.
 */
export function AccountIdentityLink({
    address,
    ...linkProps
}: AccountIdentityLinkProps): JSX.Element {
    const isSystem = normalizeIotaAddress(address) === ZERO_ADDRESS;
    const validator = useValidatorByAddress(address);

    if (validator) {
        return (
            <AddressLink
                address={address}
                showAddressAlias={false}
                label={<IdentityLabel name={validator.name} imageUrl={validator.imageUrl} />}
                {...linkProps}
            />
        );
    }

    if (isSystem) {
        return (
            <AddressLink
                address={address}
                showAddressAlias={false}
                label={
                    <div className="flex items-center gap-x-xs">
                        <IotaLogoMark className="h-5 w-5 shrink-0" />
                        <span className="truncate">{formatAddress(address)}</span>
                    </div>
                }
                {...linkProps}
            />
        );
    }

    return <AddressLink address={address} {...linkProps} />;
}
