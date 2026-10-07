// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Feature } from '@iota/core';
import { useFeature } from '@iota/apps-backend-client';

import { ExternalLink } from '_components';

export type BannerProps = {
    enabled: boolean;
    bannerUrl?: string;
    imageUrl?: string;
};

export function AppsPageBanner() {
    const AppsBannerConfig = useFeature<BannerProps>(Feature.WalletAppsBannerConfig);

    if (!AppsBannerConfig.value?.enabled) {
        return null;
    }

    return (
        <div className="mb-3">
            {AppsBannerConfig.value?.bannerUrl && (
                <ExternalLink href={AppsBannerConfig.value?.bannerUrl}>
                    <img
                        className="w-full"
                        src={AppsBannerConfig.value?.imageUrl}
                        alt="Apps Banner"
                    />
                </ExternalLink>
            )}
        </div>
    );
}
