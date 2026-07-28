// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useContext } from 'react';
import { useIotaClientQuery } from '@iota/dapp-kit';
import { getAllNetworks } from '@iota/iota-sdk/client';

import { NetworkContext } from '~/contexts';

export function NetworkVersion(): JSX.Element | null {
    const [network] = useContext(NetworkContext);
    const { data } = useIotaClientQuery('getLatestIotaSystemState');
    const { data: binaryVersion } = useIotaClientQuery('getRpcApiVersion');

    const selectedNetwork = Object.values(getAllNetworks()).find(({ id }) => id === network);

    if (!network || !data?.protocolVersion || !binaryVersion) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1 px-md py-sm">
            <div className="text-body-sm font-medium text-iota-neutral-40">
                IOTA {selectedNetwork?.name ?? 'Custom RPC'}
            </div>
            <div className="text-body-sm font-medium text-iota-neutral-40">
                v{binaryVersion} (Protocol {data.protocolVersion})
            </div>
        </div>
    );
}
