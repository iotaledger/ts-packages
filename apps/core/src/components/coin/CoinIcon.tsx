// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useCoinMetadata } from '../../hooks';
import { ImageIcon, ImageIconSize } from '../icon';
import { IotaLogoMark, PlaceholderReplace } from '@iota/apps-ui-icons';
import { IOTA_TYPE_ARG, normalizeStructTag } from '@iota/iota-sdk/utils';
import cx from 'clsx';

const IOTA_LOGO_INSET: Partial<Record<ImageIconSize, string>> = {
    [ImageIconSize.Large]: 'size-5',
};

export const COIN_FALLBACK_ICON = <PlaceholderReplace className="size-1/2" />;

function NonIotaCoin({ coinType }: { coinType: string }) {
    const { data: coinMeta } = useCoinMetadata(coinType);
    return (
        <div className="flex size-full items-center justify-center bg-iota-neutral-96 dark:bg-iota-neutral-12">
            <ImageIcon
                key={coinMeta?.iconUrl}
                src={coinMeta?.iconUrl}
                label={coinMeta?.name || coinType}
                fallback={COIN_FALLBACK_ICON}
                size={ImageIconSize.Full}
                fallbackSize={ImageIconSize.Small}
                rounded
            />
        </div>
    );
}

export interface CoinIconProps {
    coinType: string;
    size?: ImageIconSize;
    hasBorder?: boolean;
}

export function CoinIcon({ coinType, size = ImageIconSize.Full, hasBorder }: CoinIconProps) {
    const isIota = normalizeStructTag(coinType) === normalizeStructTag(IOTA_TYPE_ARG);

    return (
        <div
            className={cx(
                size,
                'flex shrink-0 items-center justify-center overflow-hidden rounded-full',
                hasBorder && 'border border-shader-neutral-light-8',
            )}
        >
            {isIota ? (
                <IotaLogoMark
                    className={cx(
                        IOTA_LOGO_INSET[size] ?? 'size-full',
                        'text-iota-neutral-10 dark:text-iota-neutral-92',
                    )}
                />
            ) : (
                <NonIotaCoin coinType={coinType} />
            )}
        </div>
    );
}
