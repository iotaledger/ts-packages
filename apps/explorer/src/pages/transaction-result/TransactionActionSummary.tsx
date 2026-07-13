// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    CoinFiatValue,
    ImageIcon,
    ImageIconSize,
    STAKING_REQUEST_EVENT,
    TransactionAction,
    UNSTAKING_REQUEST_EVENT,
    getTransactionAction,
    useCopyToClipboard,
    useFormatCoin,
} from '@iota/core';
import { ButtonUnstyled } from '@iota/apps-ui-kit';
import { Copy } from '@iota/apps-ui-icons';
import { useIotaClientQuery } from '@iota/dapp-kit';
import { IOTA_TYPE_ARG, formatAddress } from '@iota/iota-sdk/utils';
import type { IotaTransactionBlockResponse, ObjectOwner } from '@iota/iota-sdk/client';
import { useMemo, useState } from 'react';
import { AddressLink, ValidatorLink } from '~/components/ui';

const MAX_VISIBLE_LINES = 3;

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
    nftCount?: number;
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
    const sender = transaction.transaction?.data.sender;
    const action = getTransactionAction(transaction, sender);
    const [showAll, setShowAll] = useState(false);

    const detailsList: ActionSummaryDetails[] = useMemo(() => {
        const events = transaction.events ?? [];
        switch (action) {
            case TransactionAction.Staked:
            case TransactionAction.TimelockedStaked:
            case TransactionAction.Unstaked:
            case TransactionAction.TimelockedUnstaked: {
                return events
                    .filter(
                        (event) =>
                            event.type === STAKING_REQUEST_EVENT ||
                            event.type === UNSTAKING_REQUEST_EVENT,
                    )
                    .map((event) => {
                        const vested = event.transactionModule === 'timelocked_staking';
                        if (event.type === STAKING_REQUEST_EVENT) {
                            const json = event.parsedJson as {
                                amount?: string;
                                validator_address?: string;
                            };
                            return {
                                verb: 'Staked',
                                amount: BigInt(json.amount ?? 0),
                                outgoing: true,
                                vested,
                                connector: 'with validator',
                                address: json.validator_address,
                                isValidator: true,
                            };
                        }
                        const json = event.parsedJson as {
                            principal_amount?: string;
                            reward_amount?: string;
                            validator_address?: string;
                        };
                        return {
                            verb: 'Unstaked',
                            amount:
                                BigInt(json.principal_amount ?? 0) +
                                BigInt(json.reward_amount ?? 0),
                            outgoing: false,
                            vested,
                            connector: 'from validator',
                            address: json.validator_address,
                            isValidator: true,
                        };
                    });
            }
            case TransactionAction.Migration: {
                const received = (transaction.balanceChanges ?? []).filter((change) => {
                    const owner = getAddressOwner(change.owner);
                    return BigInt(change.amount) > 0n && owner && owner === sender;
                });
                const amount = received.reduce((sum, change) => sum + BigInt(change.amount), 0n);
                const nftCount = (transaction.objectChanges ?? []).filter(
                    (change) => 'objectType' in change && change.objectType.includes('::nft::Nft'),
                ).length;
                if (amount === 0n && !nftCount) {
                    return [{ verb: 'Migrated assets from the Stardust network' }];
                }
                return [
                    {
                        verb: 'Migrated',
                        amount: amount > 0n ? amount : undefined,
                        outgoing: false,
                        nftCount,
                        connector: 'from the Stardust network',
                    },
                ];
            }
            case TransactionAction.TimelockedCollect: {
                const received = (transaction.balanceChanges ?? []).filter((change) => {
                    const owner = getAddressOwner(change.owner);
                    return BigInt(change.amount) > 0n && owner && owner === sender;
                });
                const amount = received.reduce((sum, change) => sum + BigInt(change.amount), 0n);
                if (amount === 0n) {
                    return [{ verb: 'Unlocked vested tokens' }];
                }
                return [
                    {
                        verb: 'Unlocked',
                        amount,
                        outgoing: false,
                        connector: 'of vested tokens',
                    },
                ];
            }
            case TransactionAction.Send: {
                const received = (transaction.balanceChanges ?? []).filter((change) => {
                    const owner = getAddressOwner(change.owner);
                    return BigInt(change.amount) > 0n && owner && owner !== sender;
                });
                const sentObjectRecipients = (transaction.objectChanges ?? [])
                    .map((change) => {
                        if (
                            !('objectType' in change) ||
                            change.objectType.startsWith('0x2::coin::Coin')
                        ) {
                            return undefined;
                        }
                        if (change.type === 'transferred') {
                            return getAddressOwner(change.recipient);
                        }
                        if (change.type === 'mutated' || change.type === 'created') {
                            const owner = getAddressOwner(change.owner);
                            return owner && owner !== sender ? owner : undefined;
                        }
                        return undefined;
                    })
                    .filter((recipient): recipient is string => !!recipient);
                if (!received.length && !sentObjectRecipients.length) return [];

                const coinTypes = new Set(received.map((change) => change.coinType));
                const recipients = new Set(
                    [
                        ...received.map((change) => getAddressOwner(change.owner)),
                        ...sentObjectRecipients,
                    ].filter(Boolean),
                );
                return [
                    {
                        verb: 'Sent',
                        amount:
                            received.length > 0 && coinTypes.size === 1
                                ? received.reduce((sum, change) => sum + BigInt(change.amount), 0n)
                                : undefined,
                        outgoing: true,
                        coinType: received.length > 0 ? [...coinTypes][0] : undefined,
                        connector: 'to',
                        address: recipients.size === 1 ? [...recipients][0] : undefined,
                        recipientCount: recipients.size,
                        nftCount: sentObjectRecipients.length,
                    },
                ];
            }
            default:
                return [];
        }
    }, [action, transaction, sender]);

    if (!detailsList.length || transaction.effects?.status.status !== 'success') return null;

    const visibleDetails = showAll ? detailsList : detailsList.slice(0, MAX_VISIBLE_LINES);

    return (
        <div className="flex flex-col items-center gap-y-xs">
            {visibleDetails.map((details, index) => (
                <ActionSummaryLine key={index} details={details} transaction={transaction} />
            ))}
            {detailsList.length > MAX_VISIBLE_LINES && (
                <ButtonUnstyled
                    className="text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? 'Show less' : `Show all ${detailsList.length} actions`}
                </ButtonUnstyled>
            )}
        </div>
    );
}

interface ActionSummaryLineProps {
    details: ActionSummaryDetails;
    transaction: IotaTransactionBlockResponse;
}

function ActionSummaryLine({ details, transaction }: ActionSummaryLineProps): JSX.Element {
    const copyToClipboard = useCopyToClipboard();
    const { data: systemState } = useIotaClientQuery('getLatestIotaSystemState');
    const [formattedAmount, symbol] = useFormatCoin({
        balance: details.amount?.toString(),
        coinType: details.coinType,
    });

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
            {details.amount !== undefined && (
                <CoinFiatValue
                    coinType={details.coinType ?? IOTA_TYPE_ARG}
                    amount={details.amount}
                />
            )}
            {!!details.nftCount && (
                <span>
                    {details.amount !== undefined && 'and '}
                    <span className="font-medium">
                        {details.nftCount} NFT{details.nftCount > 1 ? 's' : ''}
                    </span>
                </span>
            )}
            {details.verb === 'Sent' && details.amount === undefined && !details.nftCount && (
                <span>assets</span>
            )}
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
