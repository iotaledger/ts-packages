// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
import { RecognizedBadge } from '@iota/apps-ui-icons';
import { Badge, BadgeType, Panel } from '@iota/apps-ui-kit';
import { ImageIcon, ImageIconSize, useCoinRegistryEntry } from '@iota/core';

type CoinMetaProps = {
    name: string;
    description?: string;
    iconUrl?: string | undefined | null;
    coinType: string;
};

export function CoinMeta({ name, description, iconUrl, coinType }: CoinMetaProps): JSX.Element {
    const isRecognized = !!useCoinRegistryEntry(coinType);
    return (
        <div className="flex w-full flex-col gap-md md:flex-row">
            <Panel>
                <div className="flex flex-col gap-lg p-md--rs">
                    <div className="flex flex-row gap-lg">
                        <div className="h-[80px] w-[80px] shrink-0">
                            <ImageIcon
                                src={iconUrl}
                                label={name}
                                fallback={name}
                                rounded
                                size={iconUrl ? ImageIconSize.Full : ImageIconSize.Large}
                            />
                        </div>
                        <div className="flex min-w-0 flex-col gap-sm">
                            <div className="flex flex-row items-center gap-x-sm gap-y-xs">
                                <span className="text-headline-md text-iota-neutral-10 dark:text-iota-neutral-92">
                                    {name}
                                </span>
                                {isRecognized && (
                                    <RecognizedBadge className="size-4 text-iota-primary-40" />
                                )}
                                <Badge type={BadgeType.Neutral} label="Coin" />
                            </div>
                            <div className="flex flex-wrap items-center gap-xs">
                                {description && (
                                    <p className="text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                                        {description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>
        </div>
    );
}
