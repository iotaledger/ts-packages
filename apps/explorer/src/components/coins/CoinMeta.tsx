// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { RecognizedBadge } from '@iota/apps-ui-icons';
import { Badge, BadgeType, Panel, Tooltip, TooltipPosition } from '@iota/apps-ui-kit';
import { COIN_FALLBACK_ICON, ImageIcon, ImageIconSize, useCoinRegistryEntry } from '@iota/core';

interface CoinMetaProps {
    name: string;
    description?: string;
    iconUrl?: string | undefined | null;
    coinType: string;
    symbol?: string;
}

export function CoinMeta({
    name,
    description,
    iconUrl,
    coinType,
    symbol,
}: CoinMetaProps): JSX.Element {
    const registryEntry = useCoinRegistryEntry(coinType);
    const isRecognized = !!registryEntry;
    return (
        <div className="flex w-full flex-col gap-md md:flex-row">
            <Panel>
                <div className="flex flex-col gap-lg p-md--rs">
                    <div className="flex flex-row gap-lg">
                        <div className="h-[80px] w-[80px] shrink-0">
                            <ImageIcon
                                src={iconUrl || registryEntry?.iconUrl}
                                label={name}
                                fallback={COIN_FALLBACK_ICON}
                                rounded
                                size={ImageIconSize.Full}
                                fallbackSize={ImageIconSize.Large}
                            />
                        </div>
                        <div className="flex min-w-0 flex-col gap-sm">
                            <div className="flex flex-row flex-wrap items-center gap-x-sm gap-y-xs">
                                <span className="text-headline-md text-iota-neutral-10 dark:text-iota-neutral-92">
                                    {name}
                                </span>
                                <div className="flex flex-row flex-wrap items-center gap-x-sm gap-y-xs">
                                    {isRecognized && (
                                        <RecognizedBadge className="size-4 text-iota-primary-40" />
                                    )}
                                    {symbol && (
                                        <Tooltip text="Coin Symbol" position={TooltipPosition.Top}>
                                            <span className="text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                                                {symbol}
                                            </span>
                                        </Tooltip>
                                    )}
                                    <Badge type={BadgeType.Neutral} label="Coin" />
                                </div>
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
