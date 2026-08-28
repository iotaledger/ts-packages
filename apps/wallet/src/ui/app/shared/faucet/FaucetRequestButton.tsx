// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useActiveAccount, useAppSelector } from '_hooks';
import { getCustomNetwork, toast } from '@iota/core';
import { getNetwork } from '@iota/iota-sdk/client';
import { FaucetRateLimitError, getFaucetWebsiteUrl } from '@iota/iota-sdk/faucet';
import { useFaucetMutation } from './useFaucetMutation';
import { useFaucetRateLimiter } from './useFaucetRateLimiter';
import { Button, ButtonType } from '@iota/apps-ui-kit';
import { FaucetMessageInfo } from './FaucetMessageInfo';

export function FaucetRequestButton(): JSX.Element | null {
    const network = useAppSelector(({ app }) => app.network);
    const customRpc = useAppSelector(({ app }) => app.customRpc);
    const customFaucet = useAppSelector(({ app }) => app.customFaucet);
    const networkConfig = customRpc ? getCustomNetwork(customRpc) : getNetwork(network);
    const activeAccount = useActiveAccount();
    const [isRateLimited, rateLimit] = useFaucetRateLimiter();

    // Dual faucet system: public networks (testnet, devnet) expose a faucet
    // website that must be opened in a new tab, while the rest (localnet,
    // alphanet, custom) keep using the faucet API endpoint.
    const faucetHost = customFaucet || networkConfig?.faucet;
    const faucetWebsite = !customFaucet ? networkConfig?.faucetWebsite : undefined;

    const mutation = useFaucetMutation({
        host: faucetHost,
        onError: (error) => {
            if (error instanceof FaucetRateLimitError) {
                rateLimit();
            }
        },
    });

    if (faucetWebsite) {
        return activeAccount && !activeAccount.isLocked ? (
            <Button
                type={ButtonType.Secondary}
                onClick={() => {
                    window.open(
                        getFaucetWebsiteUrl(faucetWebsite, activeAccount.address),
                        '_blank',
                        'noopener noreferrer',
                    );
                }}
                text={`Request ${networkConfig?.name} Tokens`}
                fullWidth
            />
        ) : null;
    }

    return mutation.enabled ? (
        <Button
            type={ButtonType.Secondary}
            disabled={isRateLimited}
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
            text={`Request ${networkConfig?.name} Tokens`}
            fullWidth
        />
    ) : null;
}
