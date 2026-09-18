// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import cx from 'clsx';
import { useContext, useState } from 'react';

import { NetworkContext } from '~/contexts';
import { CustomRPCInput } from '~/components/ui';
import { ampli } from '~/lib/utils';
import { type NetworkId, getAllNetworks } from '@iota/iota-sdk/client';
import { ListItem } from '@iota/apps-ui-kit';
import { CheckmarkFilled } from '@iota/apps-ui-icons';

interface NetworkOption {
    id: string;
    label: string;
}

export function NetworkSelector(): JSX.Element {
    const [network, setNetwork] = useContext(NetworkContext);

    const networks = Object.values(getAllNetworks()).map((network) => ({
        id: network.id,
        label: network.name,
    })) as NetworkOption[];

    const selectedNetwork = networks.find(({ id }) => id === network);
    const isCustomNetwork = !selectedNetwork;
    const [customOpen, setCustomOpen] = useState(isCustomNetwork);

    const handleNetworkSwitch = (networkId: NetworkId) => {
        ampli.switchedNetwork({ toNetwork: networkId });
        setNetwork(networkId);
    };

    return (
        <>
            {networks.map((networkOption) => (
                <ListItem
                    key={networkOption.id}
                    onClick={() => handleNetworkSwitch(networkOption.id)}
                    hideBottomBorder
                    isHighlighted={networkOption === selectedNetwork}
                >
                    <div className="flex items-center gap-2">
                        <CheckmarkFilled
                            className={cx('flex-shrink-0', {
                                'text-iota-primary-30': networkOption === selectedNetwork,
                                'text-gray-45': networkOption !== selectedNetwork,
                            })}
                        />
                        {networkOption.label}
                    </div>
                </ListItem>
            ))}
            <ListItem key="custom-rpc" onClick={() => setCustomOpen(true)} hideBottomBorder>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <CheckmarkFilled
                            className={cx('flex-shrink-0', {
                                'text-success': isCustomNetwork,
                                'text-gray-45': !isCustomNetwork,
                            })}
                        />
                        Custom RPC URL
                    </div>
                    {customOpen && (
                        <div className="mt-3">
                            For full functionality, provide an indexer URL.
                            <CustomRPCInput
                                value={isCustomNetwork ? network : ''}
                                onChange={handleNetworkSwitch}
                            />
                        </div>
                    )}
                </div>
            </ListItem>
        </>
    );
}
