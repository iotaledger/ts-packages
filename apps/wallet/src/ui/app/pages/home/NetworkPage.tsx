// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { NetworkSelector } from '_components';
import { FaucetRequestButton } from '_src/ui/app/shared/faucet/FaucetRequestButton';
import { PageTemplate } from '_src/ui/app/components/PageTemplate';
import { useAppSelector } from '_hooks';
import { getCustomNetwork } from '@iota/core';
import { getNetwork } from '@iota/iota-sdk/client';
import { useNavigate } from 'react-router-dom';

export function NetworkPage() {
    const network = useAppSelector(({ app }) => app.network);
    const customRpc = useAppSelector(({ app }) => app.customRpc);
    const networkConfig = customRpc ? getCustomNetwork(customRpc) : getNetwork(network);
    const hasFaucet = !!networkConfig?.faucet;

    const navigate = useNavigate();

    return (
        <PageTemplate title="Network" onClose={() => navigate(-1)}>
            <div className="flex h-full flex-col justify-between">
                <NetworkSelector />
                {hasFaucet && (
                    <>
                        <div className="flex w-full flex-col items-center gap-y-sm border-t border-shader-neutral-light-8 pt-md dark:border-shader-neutral-dark-8">
                            <p className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                                Get free tokens for testing on this network
                            </p>
                            <FaucetRequestButton />
                        </div>
                    </>
                )}
            </div>
        </PageTemplate>
    );
}
