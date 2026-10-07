// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ConnectButton } from '@rainbow-me/rainbowkit';
interface ConnectButtonL2Props {
    text?: string;
}

export function ConnectButtonL2({
    text = 'Connect L2 Wallet',
}: ConnectButtonL2Props): React.JSX.Element {
    return (
        <div className="text-label-lg" data-testid="connect-l2-wallet" data-amp-mask>
            <ConnectButton
                label={text}
                accountStatus={{
                    smallScreen: 'full',
                    largeScreen: 'full',
                }}
                showBalance={{
                    smallScreen: true,
                    largeScreen: true,
                }}
            />
        </div>
    );
}
