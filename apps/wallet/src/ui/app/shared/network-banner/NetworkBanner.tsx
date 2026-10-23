// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useNextMenuUrl } from '_components';
import { useAppSelector } from '_hooks';
import { getCustomNetwork } from '@iota/core';
import { ArrowRight, Warning } from '@iota/apps-ui-icons';
import { getNetwork, Network } from '@iota/iota-sdk/client';
import { Link } from 'react-router-dom';
import cn from 'clsx';

export function NetworkBanner({ className }: { className?: string }) {
    const network = useAppSelector((state) => state.app.network);
    const networkUrl = useNextMenuUrl(true, '/network');

    if (network === Network.Mainnet) {
        return null;
    }

    const networkConfig = network === Network.Custom ? getCustomNetwork() : getNetwork(network);

    return (
        <div
            className={cn(
                'w-full bg-iota-neutral-100 px-md pb-xs dark:bg-iota-neutral-6',
                className,
            )}
        >
            <div
                className="flex items-center justify-between gap-xs rounded-lg bg-warning-surface px-sm py-xs text-on-warning"
                data-testid="network-banner"
            >
                <div className="flex min-w-0 items-center gap-xs">
                    <Warning className="h-4 w-4 shrink-0" />
                    <span className="truncate text-body-sm">
                        You are on {networkConfig.name} network
                    </span>
                </div>
                <Link
                    to={networkUrl}
                    className="flex shrink-0 items-center gap-xxs text-label-md text-on-warning no-underline"
                >
                    Change
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}
