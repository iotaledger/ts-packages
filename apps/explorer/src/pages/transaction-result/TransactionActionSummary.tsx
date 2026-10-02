// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    type CoinAmountChange,
    CoinFiatValue,
    CoinIcon,
    CoinOwnerType,
    ImageIcon,
    ImageIconSize,
    STAKING_REQUEST_EVENT,
    STARDUST_PACKAGE_ID,
    TransactionAction,
    UNSTAKING_REQUEST_EVENT,
    getTransactionAction,
    getTransactionCoinBalances,
    isMigrationTransaction,
    isUnlockTimelockedObjectTransaction,
    useCopyToClipboard,
    useFormatCoin,
} from '@iota/core';
import { ButtonUnstyled } from '@iota/apps-ui-kit';
import { Copy, IotaLogoMark } from '@iota/apps-ui-icons';
import { useIotaClientQuery } from '@iota/dapp-kit';
import {
    CoinFormat,
    IOTA_FRAMEWORK_ADDRESS,
    IOTA_SYSTEM_ADDRESS,
    IOTA_TYPE_ARG,
    MOVE_STDLIB_ADDRESS,
    formatAddress,
    normalizeIotaAddress,
} from '@iota/iota-sdk/utils';
import type { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { type ReactNode, useMemo, useState } from 'react';
import { AddressLink, ObjectLink, ValidatorLink } from '~/components/ui';
import { getSendRecipients } from '~/lib/utils';

const MAX_VISIBLE_LINES = 3;
const SYSTEM_PACKAGE_ID = normalizeIotaAddress(IOTA_SYSTEM_ADDRESS);
const FRAMEWORK_PACKAGE_IDS = [
    MOVE_STDLIB_ADDRESS,
    IOTA_FRAMEWORK_ADDRESS,
    SYSTEM_PACKAGE_ID,
    STARDUST_PACKAGE_ID,
].map((address) => normalizeIotaAddress(address));

type SummaryAction =
    | { type: 'stake'; amount: bigint; vested: boolean; validatorAddress: string }
    | { type: 'unstake'; amount: bigint; vested: boolean; validatorAddress: string }
    | { type: 'migrateCoin'; coinType: string; amount: bigint }
    | { type: 'migrateNfts'; count: number }
    | { type: 'migrateAssets' }
    | { type: 'unlockCoin'; coinType: string; amount: bigint }
    | { type: 'unlockAssets' }
    | { type: 'sendCoin'; coinType: string; amount: bigint; recipient: string }
    | { type: 'sendNfts'; count: number; recipient: string }
    | {
          type: 'moveCall';
          packageId: string;
          functionName: string;
          coinChanges: CoinAmountChange[];
      }
    | { type: 'genesis' };

function getSummaryActions(transaction: IotaTransactionBlockResponse): SummaryAction[] {
    const sender = transaction.transaction?.data.sender;
    const transactionKind = transaction.transaction?.data.transaction;
    if (transactionKind?.kind === 'Genesis') return [{ type: 'genesis' }];

    const actions: SummaryAction[] = [];

    for (const event of transaction.events ?? []) {
        // Liquid staking pools stake and unstake internally; those events are not the sender's.
        if (normalizeIotaAddress(event.packageId) !== SYSTEM_PACKAGE_ID) continue;
        const vested = event.transactionModule === 'timelocked_staking';
        const json = event.parsedJson as {
            amount?: string;
            principal_amount?: string;
            reward_amount?: string;
            validator_address: string;
        };
        let type: 'stake' | 'unstake';
        let amount: bigint;
        if (event.type === STAKING_REQUEST_EVENT) {
            type = 'stake';
            amount = BigInt(json.amount ?? 0);
        } else if (event.type === UNSTAKING_REQUEST_EVENT) {
            type = 'unstake';
            amount = BigInt(json.principal_amount ?? 0) + BigInt(json.reward_amount ?? 0);
        } else {
            continue;
        }

        const sameValidatorAction = actions.find(
            (action): action is Extract<SummaryAction, { type: 'stake' | 'unstake' }> =>
                action.type === type &&
                action.vested === vested &&
                action.validatorAddress === json.validator_address,
        );
        if (sameValidatorAction) {
            sameValidatorAction.amount += amount;
        } else {
            actions.push({ type, amount, vested, validatorAddress: json.validator_address });
        }
    }

    const owners = getTransactionCoinBalances(transaction)?.owners ?? [];
    const senderChanges = owners.find(({ owner }) => owner === sender)?.changes ?? [];
    const receivedBySender = senderChanges.filter(({ amount }) => amount > 0n);
    const coinTypesSpentBySender = new Set(
        senderChanges.filter(({ amount }) => amount < 0n).map(({ coinType }) => coinType),
    );

    if (isMigrationTransaction(transaction.transaction)) {
        const nftCount = (transaction.objectChanges ?? []).filter(
            (change) => 'objectType' in change && change.objectType.includes('::nft::Nft'),
        ).length;
        for (const { coinType, amount } of receivedBySender) {
            actions.push({ type: 'migrateCoin', coinType, amount });
        }
        if (nftCount) actions.push({ type: 'migrateNfts', count: nftCount });
        if (!receivedBySender.length && !nftCount) actions.push({ type: 'migrateAssets' });
    } else if (!actions.length && isUnlockTimelockedObjectTransaction(transaction.transaction)) {
        for (const { coinType, amount } of receivedBySender) {
            actions.push({ type: 'unlockCoin', coinType, amount });
        }
        if (!receivedBySender.length) actions.push({ type: 'unlockAssets' });
    }

    if (getTransactionAction(transaction, sender) === TransactionAction.Send) {
        for (const { owner, ownerType, changes } of owners) {
            if (owner === sender || ownerType !== CoinOwnerType.Address) continue;
            for (const { coinType, amount } of changes) {
                if (amount > 0n && coinTypesSpentBySender.has(coinType)) {
                    actions.push({ type: 'sendCoin', coinType, amount, recipient: owner });
                }
            }
        }

        const nftCountByRecipient = new Map<string, number>();
        for (const recipient of getSendRecipients(transaction, sender).objectRecipients) {
            nftCountByRecipient.set(recipient, (nftCountByRecipient.get(recipient) ?? 0) + 1);
        }
        for (const [recipient, count] of nftCountByRecipient) {
            actions.push({ type: 'sendNfts', count, recipient });
        }
    }

    const moveCalls =
        transactionKind?.kind === 'ProgrammableTransaction'
            ? transactionKind.transactions.flatMap((command) =>
                  'MoveCall' in command &&
                  !FRAMEWORK_PACKAGE_IDS.includes(normalizeIotaAddress(command.MoveCall.package))
                      ? [command.MoveCall]
                      : [],
              )
            : [];
    const distinctCalls = new Set(
        moveCalls.map((call) => `${call.package}::${call.module}::${call.function}`),
    );
    if (distinctCalls.size === 1) {
        actions.push({
            type: 'moveCall',
            packageId: moveCalls[0].package,
            functionName: moveCalls[0].function,
            coinChanges: actions.length ? [] : senderChanges,
        });
    }

    return actions;
}

interface TransactionActionSummaryProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionActionSummary({
    transaction,
}: TransactionActionSummaryProps): JSX.Element | null {
    const [showAll, setShowAll] = useState(false);
    const actions = useMemo(() => getSummaryActions(transaction), [transaction]);

    if (!actions.length || transaction.effects?.status.status !== 'success') return null;

    const visibleActions = showAll ? actions : actions.slice(0, MAX_VISIBLE_LINES);

    return (
        <div className="flex flex-col items-center gap-y-xs">
            {visibleActions.map((action, index) => (
                <ActionSummaryLine key={index} action={action} />
            ))}
            {actions.length > MAX_VISIBLE_LINES && (
                <ButtonUnstyled
                    className="text-label-md text-iota-primary-30 dark:text-iota-primary-80"
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? 'Show Less' : `Show all ${actions.length} actions`}
                </ButtonUnstyled>
            )}
        </div>
    );
}

function ActionSummaryLine({ action }: { action: SummaryAction }): JSX.Element {
    switch (action.type) {
        case 'stake':
            return (
                <SummaryLine>
                    <span>Stake</span>
                    <CoinAmount amount={action.amount} vested={action.vested} outgoing />
                    <span>with validator</span>
                    <ValidatorBadge address={action.validatorAddress} />
                </SummaryLine>
            );
        case 'unstake':
            return (
                <SummaryLine>
                    <span>Unstaked</span>
                    <CoinAmount amount={action.amount} vested={action.vested} />
                    <span>from validator</span>
                    <ValidatorBadge address={action.validatorAddress} />
                </SummaryLine>
            );
        case 'migrateCoin':
            return (
                <SummaryLine>
                    <span>Migrated</span>
                    <CoinAmount coinType={action.coinType} amount={action.amount} />
                    <span>from the Stardust network</span>
                </SummaryLine>
            );
        case 'migrateNfts':
            return (
                <SummaryLine>
                    <span>Migrated</span>
                    <NftCount count={action.count} />
                    <span>from the Stardust network</span>
                </SummaryLine>
            );
        case 'migrateAssets':
            return (
                <SummaryLine>
                    <span>Migrated assets from the Stardust network</span>
                </SummaryLine>
            );
        case 'unlockCoin':
            return (
                <SummaryLine>
                    <span>Unlocked</span>
                    <CoinAmount coinType={action.coinType} amount={action.amount} />
                    <span>of vested tokens</span>
                </SummaryLine>
            );
        case 'unlockAssets':
            return (
                <SummaryLine>
                    <span>Unlocked vested tokens</span>
                </SummaryLine>
            );
        case 'sendCoin':
            return (
                <SummaryLine>
                    <span>Send</span>
                    <CoinAmount coinType={action.coinType} amount={action.amount} outgoing />
                    <span>to</span>
                    <AddressLink address={action.recipient} copyText={action.recipient} />
                </SummaryLine>
            );
        case 'sendNfts':
            return (
                <SummaryLine>
                    <span>Send</span>
                    <NftCount count={action.count} />
                    <span>to</span>
                    <AddressLink address={action.recipient} copyText={action.recipient} />
                </SummaryLine>
            );
        case 'moveCall':
            return (
                <SummaryLine>
                    <span>Call</span>
                    <span className="font-mono">{action.functionName}</span>
                    <span>from</span>
                    <ObjectLink objectId={action.packageId} copyText={action.packageId} />
                    {action.coinChanges.map(({ coinType, amount }) => (
                        <CoinAmount
                            key={coinType}
                            coinType={coinType}
                            amount={amount < 0n ? -amount : amount}
                            outgoing={amount < 0n}
                        />
                    ))}
                </SummaryLine>
            );
        case 'genesis':
            return (
                <SummaryLine>
                    <span>Genesis</span>
                </SummaryLine>
            );
    }
}

function SummaryLine({ children }: { children: ReactNode }): JSX.Element {
    return (
        <div className="flex flex-wrap items-center justify-center gap-x-xs gap-y-xxs text-body-lg text-iota-neutral-10 dark:text-iota-neutral-92">
            {children}
        </div>
    );
}

interface CoinAmountProps {
    amount: bigint;
    coinType?: string;
    outgoing?: boolean;
    vested?: boolean;
}

function CoinAmount({
    amount,
    coinType = IOTA_TYPE_ARG,
    outgoing,
    vested,
}: CoinAmountProps): JSX.Element {
    const [formattedAmount, symbol] = useFormatCoin({
        balance: amount,
        coinType,
        format: CoinFormat.Full,
        truncate: false,
    });

    return (
        <>
            <span className="flex items-center gap-x-xs">
                <CoinIcon coinType={coinType} size={ImageIconSize.Small} />
                <span className={outgoing ? 'coin-change-negative' : 'coin-change-positive'}>
                    {outgoing ? '-' : '+'}
                    {formattedAmount} {vested ? `vested ${symbol}` : symbol}
                </span>
            </span>
            <CoinFiatValue coinType={coinType} amount={amount} showApproxSymbol />
        </>
    );
}

function NftCount({ count }: { count: number }): JSX.Element {
    return (
        <span className="font-medium">
            {count} NFT{count > 1 ? 's' : ''}
        </span>
    );
}

function ValidatorBadge({ address }: { address: string }): JSX.Element {
    const copyToClipboard = useCopyToClipboard();
    const { data: systemState } = useIotaClientQuery('getLatestIotaSystemState');
    const validator = systemState?.activeValidators.find((v) => v.iotaAddress === address);

    return (
        <span className="flex items-center gap-x-xs">
            {validator?.imageUrl ? (
                <ImageIcon
                    src={validator.imageUrl}
                    label={validator.name}
                    fallback={validator.name}
                    size={ImageIconSize.Small}
                    rounded
                />
            ) : (
                <IotaLogoMark className="h-5 w-5 shrink-0" />
            )}
            <ValidatorLink address={address} label={validator?.name} showAddressAlias={false} />
            {validator?.name && (
                <span className="flex items-center gap-x-xxs text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                    {formatAddress(address)}
                    <ButtonUnstyled
                        onClick={() => copyToClipboard(address)}
                        aria-label="Copy to clipboard"
                    >
                        <Copy className="shrink-0 cursor-pointer" />
                    </ButtonUnstyled>
                </span>
            )}
        </span>
    );
}
