// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useCurrentWallet } from '@iota/dapp-kit';
import { requestIotaFromFaucetV0, getFaucetWebsiteUrl } from '@iota/iota-sdk/faucet';
import { useNetworkVariables } from '../config/l1config';
import { Button } from '@iota/apps-ui-kit';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ampli } from '../shared/analytics';

export function FaucetButton() {
    const { isConnected } = useCurrentWallet();
    const currentAccount = useCurrentAccount();
    const variables = useNetworkVariables();

    const recipient = currentAccount?.address;
    // Dual faucet system: networks with a faucet website open it in a new tab,
    // networks with a faucet API endpoint are requested directly.
    const isFaucetEnabled = !!variables.faucet || !!variables.faucetWebsite;

    const { mutateAsync: requestFaucet, isPending } = useMutation({
        mutationKey: ['faucet-funds', recipient],
        async mutationFn() {
            toast('Requesting funds from faucet...');
            ampli.requestedFaucetFunds();
            if (recipient && variables.faucet) {
                await requestIotaFromFaucetV0({
                    host: variables.faucet,
                    recipient,
                });
            }
        },
        onSuccess() {
            toast.success('Funds successfully sent.');
        },
        onError() {
            toast.error('Something went wrong while requesting funds.');
        },
    });

    function onFaucetClick() {
        if (variables.faucetWebsite) {
            ampli.requestedFaucetFunds();
            window.open(
                getFaucetWebsiteUrl(variables.faucetWebsite, recipient),
                '_blank',
                'noopener noreferrer',
            );
        } else {
            requestFaucet();
        }
    }

    if (!isFaucetEnabled) {
        return null;
    }

    return (
        <Button
            text="Request funds"
            onClick={onFaucetClick}
            disabled={!isConnected || isPending}
            testId="request-l1-funds-button"
        />
    );
}
