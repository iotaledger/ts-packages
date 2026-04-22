// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useAppSelector } from '_hooks';
import { getCustomNetwork, toast } from '@iota/core';
import { getNetwork } from '@iota/iota-sdk/client';
import { FaucetRateLimitError } from '@iota/iota-sdk/faucet';
import { useFaucetMutation } from './useFaucetMutation';
import { useFaucetRateLimiter } from './useFaucetRateLimiter';
import { Button, ButtonType } from '@iota/apps-ui-kit';
import { FaucetMessageInfo } from './FaucetMessageInfo';
import { Loader2 } from '@iota/apps-ui-icons';

export function FaucetRequestButton(): JSX.Element | null {
    const network = useAppSelector(({ app }) => app.network);
    const customRpc = useAppSelector(({ app }) => app.customRpc);
    const networkConfig = customRpc ? getCustomNetwork(customRpc) : getNetwork(network);
    const [isRateLimited, rateLimit] = useFaucetRateLimiter();

    const mutation = useFaucetMutation({
        host: networkConfig?.faucet,
        onError: (error) => {
            if (error instanceof FaucetRateLimitError) {
                rateLimit();
            }
        },
    });
    const isLoading = mutation.isMutating;
    return mutation.enabled ? (
        <div className="flex w-full flex-col gap-xs">
            <Button
                type={ButtonType.Secondary}
                disabled={isRateLimited || isLoading}
                onClick={() => {
                    toast.promise(
                        mutation.mutateAsync(),
                        {
                            loading: <FaucetMessageInfo loading />,
                            success: (totalReceived) => (
                                <FaucetMessageInfo totalReceived={totalReceived} />
                            ),
                            error: (error) => <FaucetMessageInfo error={error.message} />,
                        },
                        {
                            duration: 5000,
                        },
                    );
                }}
                icon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                text={isLoading ? 'Requesting tokens…' : `Request ${networkConfig?.name} Tokens`}
                testId="faucet-button"
                fullWidth
            />
            {isRateLimited && (
                <p className="text-center text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                    Rate limit reached, please try again in a few minutes
                </p>
            )}
        </div>
    ) : null;
}
