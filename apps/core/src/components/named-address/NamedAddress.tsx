// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Address } from '@iota/apps-ui-kit';
import { useGetDefaultIotaName } from '../../hooks';
import { truncateString } from '../../utils';
import { formatAddress } from '@iota/iota-sdk/utils';
import { NameAvatar, NameAvatarSize } from '../icon';
import clsx from 'clsx';

interface NamedAddressProps extends Omit<React.ComponentProps<typeof Address>, 'text'> {
    address: string;
}

export function NamedAddress({
    address,
    isCopyable,
    isExternal,
    externalLink,
    copyText,
    onCopySuccess,
    onCopyError,
    onOpen,
}: NamedAddressProps): React.JSX.Element {
    const { data: iotaName } = useGetDefaultIotaName(address);
    const formattedAddress = formatAddress(address);

    return (
        <div className={clsx('flex flex-row gap-x-xxs', iotaName && 'items-center')}>
            {iotaName ? (
                <span className="flex items-center gap-xs text-label-md text-iota-neutral-10 dark:text-iota-neutral-92">
                    <NameAvatar address={address} size={NameAvatarSize.Xxs} />
                    {truncateString(iotaName, 12)}
                </span>
            ) : null}
            <Address
                text={formattedAddress}
                isCopyable={isCopyable}
                isExternal={isExternal}
                externalLink={externalLink}
                copyText={copyText}
                onCopySuccess={onCopySuccess}
                onCopyError={onCopyError}
                onOpen={onOpen}
            />
        </div>
    );
}
