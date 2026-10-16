// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { ConnectButton as DappConnectButton } from '@iota/dapp-kit';

export function ConnectButton() {
    return (
        <div className="amp-obfuscation">
            <DappConnectButton connectText="Connect" />
        </div>
    );
}
