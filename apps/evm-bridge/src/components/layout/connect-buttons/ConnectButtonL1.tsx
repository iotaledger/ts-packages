// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { ConnectButton } from '@iota/dapp-kit';

interface ConnectButtonL1Props {
    connectText?: string;
    className?: string;
    size?: React.ComponentProps<typeof ConnectButton>['size'];
    iotaNamesEnabled?: boolean;
}

export function ConnectButtonL1({
    connectText = 'Connect L1 Wallet',
    className,
    size,
    iotaNamesEnabled = true,
}: ConnectButtonL1Props) {
    return (
        <div data-amp-mask>
            <ConnectButton
                data-testid="connect-l1-wallet"
                className={className}
                connectText={connectText}
                size={size}
                iotaNamesEnabled={iotaNamesEnabled}
            />
        </div>
    );
}
