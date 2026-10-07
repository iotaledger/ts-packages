// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { IotaLogoMark, Warning } from '@iota/apps-ui-icons';
import cx from 'clsx';
import type { ResolvedAddressAlias } from '../../hooks';
import { ImageIcon, ImageIconSize } from '../icon';

export function AddressAliasIcon({
    addressAlias,
}: {
    addressAlias: ResolvedAddressAlias;
}): React.JSX.Element {
    return (
        <div className="h-5 w-5 shrink-0">
            {addressAlias.isScam ? (
                <div
                    className={cx(
                        'flex items-center justify-center rounded-full',
                        ImageIconSize.Small,
                    )}
                >
                    <Warning className="dark:text-iota-warning-60 text-iota-warning-40" />
                </div>
            ) : addressAlias.imageUrl ? (
                <ImageIcon
                    src={addressAlias.imageUrl}
                    label={addressAlias.alias}
                    fallback={addressAlias.alias}
                    size={ImageIconSize.Small}
                    rounded
                />
            ) : (
                <IotaLogoMark className="h-full w-full" />
            )}
        </div>
    );
}
