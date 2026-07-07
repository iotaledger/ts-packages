// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    ImageIcon,
    ImageIconSize,
    TransactionAction,
    getStakeDetailsFromEvents,
    getTransactionAction,
    formatBalanceToUSD,
    getUnstakeDetailsFromEvents,
    useBalanceInUSD,
    useCopyToClipboard,
    useFormatCoin,
} from '@iota/core';
import { ButtonUnstyled } from '@iota/apps-ui-kit';
import { Copy } from '@iota/apps-ui-icons';
import { useIotaClientContext, useIotaClientQuery } from '@iota/dapp-kit';
import { IOTA_TYPE_ARG, formatAddress } from '@iota/iota-sdk/utils';
import type { IotaTransactionBlockResponse, Network, ObjectOwner } from '@iota/iota-sdk/client';
import { useMemo } from 'react';
import { AddressLink, ValidatorLink } from '~/components/ui';

interface ActionSummaryDetails {
    verb: string;
    amount?: bigint;
    outgoing?: boolean;
    coinType?: string;
    vested?: boolean;
    connector?: string;
    address?: string;
    isValidator?: boolean;
    recipientCount?: number;
}

function getAddressOwner(owner?: ObjectOwner | null): string | undefined {
    return owner && typeof owner === 'object' && 'AddressOwner' in owner
        ? owner.AddressOwner
        : undefined;
}

interface TransactionActionSummaryProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionActionSummary({
    transaction,
}: TransactionActionSummaryProps): JSX.Element | null {
    const copyToClipboard = useCopyToClipboard();
    const sender = transaction.transaction?.data.sender;
    const action = getTransactionAction(transaction, sender);
    const { data: systemState } = useIotaClientQuery('getLatestIotaSystemState');

    const details: ActionSummaryDetails | null = useMemo(() => {
        const events = transaction.events ?? [];
        switch (action) {
            case TransactionAction.Staked:
            case TransactionAction.TimelockedStaked: {
                const { totalStakedAmount, validatorAddress } = getStakeDetailsFromEvents(events);
                return {
                    verb: 'Staked',
                    amount: BigInt(totalStakedAmount),
                    outgoing: true,
                    vested: action === TransactionAction.TimelockedStaked,
                    connector: 'with validator',
                    address: validatorAddress,
                    isValidator: true,
                };
            }
            case TransactionAction.Unstaked:
            case TransactionAction.TimelockedUnstaked: {
                const { totalUnstakeAmount, validatorAddress } =
                    getUnstakeDetailsFromEvents(events);
                return {
                    verb: 'Unstaked',
                    amount: totalUnstakeAmount,
                    outgoing: false,
                    vested: action === TransactionAction.TimelockedUnstaked,
                    connector: 'from validator',
                    address: validatorAddress,
                    isValidator: true,
                };
            }
            case TransactionAction.Migration:
                return { verb: 'Migrated assets from the Stardust network' };
            case TransactionAction.TimelockedCollect:
                return { verb: 'Unlocked vested tokens' };
            case TransactionAction.Send: {
                const received = (transaction.balanceChanges ?? []).filter((change) => {
                    const owner = getAddressOwner(change.owner);
                    return BigInt(change.amount) > 0n && owner && owner !== sender;
                });
                if (!received.length) return null;

                const coinTypes = new Set(received.map((change) => change.coinType));
                const recipients = new Set(received.map((change) => getAddressOwner(change.owner)));
                return {
                    verb: 'Sent',
                    amount:
                        coinTypes.size === 1
                            ? received.reduce((sum, change) => sum + BigInt(change.amount), 0n)
                            : undefined,
                    outgoing: true,
                    coinType: [...coinTypes][0],
                    connector: 'to',
                    address: recipients.size === 1 ? [...recipients][0] : undefined,
                    recipientCount: recipients.size,
                };
            }
            default:
                return null;
        }
    }, [action, transaction, sender]);

    const [formattedAmount, symbol] = useFormatCoin({
        balance: details?.amount?.toString(),
        coinType: details?.coinType,
    });
    const { network } = useIotaClientContext();
    const amountInUSD = useBalanceInUSD(
        details?.coinType ?? IOTA_TYPE_ARG,
        details?.amount?.toString() ?? 0,
        network as Network,
    );

    if (!details || transaction.effects?.status.status !== 'success') return null;

    const validator = details.isValidator
        ? systemState?.activeValidators.find((v) => v.iotaAddress === details.address)
        : undefined;

    return (
        <div className="flex flex-wrap items-center gap-x-xs gap-y-xxs text-body-lg text-iota-neutral-10 dark:text-iota-neutral-92">
            <span>{details.verb}</span>
            {details.amount !== undefined && (
                <span
                    className={
                        details.outgoing
                            ? 'text-iota-error-30 dark:text-iota-error-80'
                            : 'text-iota-tertiary-30 dark:text-iota-tertiary-80'
                    }
                >
                    {details.outgoing ? '-' : '+'}
                    {formattedAmount} {details.vested ? `vested ${symbol}` : symbol}
                </span>
            )}
            {details.amount !== undefined && amountInUSD && Math.abs(amountInUSD) >= 0.005 ? (
                <span className="text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                    ({formatBalanceToUSD(amountInUSD)})
                </span>
            ) : null}
            {details.verb === 'Sent' && details.amount === undefined && <span>assets</span>}
            {details.connector && <span>{details.connector}</span>}
            {details.address ? (
                details.isValidator ? (
                    <span className="flex items-center gap-x-xs">
                        {validator && (
                            <ImageIcon
                                src={validator.imageUrl}
                                label={validator.name}
                                fallback={validator.name}
                                size={ImageIconSize.Small}
                                rounded
                            />
                        )}
                        <ValidatorLink
                            address={details.address}
                            label={validator?.name}
                            showAddressAlias={false}
                        />
                        {validator?.name && (
                            <span className="flex items-center gap-x-xxs text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                                {formatAddress(details.address)}
                                <ButtonUnstyled
                                    onClick={() => copyToClipboard(details.address!)}
                                    aria-label="Copy to clipboard"
                                >
                                    <Copy className="shrink-0 cursor-pointer" />
                                </ButtonUnstyled>
                            </span>
                        )}
                    </span>
                ) : (
                    <AddressLink address={details.address} />
                )
            ) : details.recipientCount && details.recipientCount > 1 ? (
                <span>{details.recipientCount} recipients</span>
            ) : null}
        </div>
    );
}
