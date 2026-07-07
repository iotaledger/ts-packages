// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { DisplayStats } from '@iota/apps-ui-kit';
import { formatBalanceToUSD, useBalanceInUSD, useFormatCoin } from '@iota/core';
import { useIotaClientContext } from '@iota/dapp-kit';
import { type Network } from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';
import { AddressLink, CheckpointSequenceLink, DateDisplay, EpochLink } from '~/components';
import { onCopySuccess } from '~/lib/utils';

interface TransactionDetailsProps {
    sender?: string;
    checkpoint?: string | null;
    executedEpoch?: string;
    timestamp?: string | null;
    totalGas?: string;
}

export function TransactionDetails({
    sender,
    checkpoint,
    executedEpoch,
    timestamp,
    totalGas,
}: TransactionDetailsProps): JSX.Element {
    const { network } = useIotaClientContext();
    const [formattedGas, gasSymbol] = useFormatCoin({ balance: totalGas });
    const gasInUSD = useBalanceInUSD(IOTA_TYPE_ARG, totalGas ?? 0, network as Network);

    return (
        <div className="grid grid-cols-1 gap-sm md:grid-cols-5">
            {sender && (
                <DisplayStats
                    label="Sender"
                    value={
                        <div className="flex flex-col gap-y-xxs">
                            <AddressLink address={sender} copyText={sender} />
                        </div>
                    }
                />
            )}
            {checkpoint && (
                <DisplayStats
                    label="Checkpoint"
                    value={
                        <CheckpointSequenceLink sequence={checkpoint}>
                            {Number(checkpoint).toLocaleString()}
                        </CheckpointSequenceLink>
                    }
                    copyText={checkpoint}
                    onCopySuccess={onCopySuccess}
                />
            )}
            {executedEpoch && (
                <DisplayStats
                    label="Epoch"
                    value={<EpochLink epoch={executedEpoch}>{executedEpoch}</EpochLink>}
                />
            )}

            {timestamp && (
                <DisplayStats
                    label="Date"
                    value={<DateDisplay timestamp={timestamp} type="transaction" showTimeAgo />}
                />
            )}

            {totalGas && (
                <DisplayStats
                    label="Gas Fee"
                    value={`${formattedGas} ${gasSymbol}`}
                    supportingLabel={
                        gasInUSD && Math.abs(gasInUSD) >= 0.005
                            ? formatBalanceToUSD(gasInUSD)
                            : undefined
                    }
                />
            )}
        </div>
    );
}
