// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    type DryRunTransactionBlockResponse,
    type IotaTransactionBlockResponse,
} from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG } from '@iota/iota-sdk/utils';

import { TransactionAction } from '../../interfaces';
import { type BalanceChangeSummary, type IotaObjectChangeWithDisplay } from '../../types';
import { getBalanceChangeSummary } from './getBalanceChangeSummary';
import { getGasSummary } from './getGasSummary';
import { getTransactionAction } from './getTransactionAction';
import { narrateObjectChanges, type NarratedObjectChanges } from './narrateObjectChanges';
import { recognizePtbEffects, type PtbRecognitionResult } from './recognizePtbEffects';

export type TransactionKind =
    | 'send'
    | 'receive'
    | 'stake'
    | 'unstake'
    | 'timelocked-collect'
    | 'timelocked-stake'
    | 'timelocked-unstake'
    | 'migration'
    | 'contract-call'
    | 'system'
    | 'failed';

export type TransactionDisplay = {
    kind: TransactionKind;
    status: 'success' | 'failure';
    failureMessage?: string;
    timestampMs?: string;
    digest?: string;
    sender?: string;
    /** Non-self owners extracted from balance changes, with direction relative to `perspective`. */
    counterparties: {
        direction: 'to' | 'from';
        address: string;
        amounts: { coinType: string; amount: bigint }[];
    }[];
    /** Most significant balance change for the perspective address (signed). */
    primary?: { coinType: string; amount: bigint };
    /** Gas cost breakdown — always computed; UI decides whether to show based on sender check. */
    fee?: { computation: bigint; storage: bigint; rebate: bigint; net: bigint };
    balanceChangesByOwner: BalanceChangeSummary;
    narratedObjectChanges: NarratedObjectChanges;
    /** PTB pattern recognition — present only when the tx is a ProgrammableTransaction. */
    ptbRecognition?: PtbRecognitionResult;
};

const ACTION_TO_KIND: Partial<Record<TransactionAction, TransactionKind>> = {
    [TransactionAction.Send]: 'send',
    [TransactionAction.Receive]: 'receive',
    [TransactionAction.Staked]: 'stake',
    [TransactionAction.Unstaked]: 'unstake',
    [TransactionAction.TimelockedCollect]: 'timelocked-collect',
    [TransactionAction.TimelockedStaked]: 'timelocked-stake',
    [TransactionAction.TimelockedUnstaked]: 'timelocked-unstake',
    [TransactionAction.Migration]: 'migration',
};

function isDryRun(
    tx: IotaTransactionBlockResponse | DryRunTransactionBlockResponse,
): tx is DryRunTransactionBlockResponse {
    return !('digest' in tx);
}

function deriveKind(
    action: TransactionAction,
    transaction: IotaTransactionBlockResponse,
    status: 'success' | 'failure',
): TransactionKind {
    const mapped = ACTION_TO_KIND[action];
    if (mapped) return mapped;

    // TransactionAction.Transaction (and PersonalMessage) need further classification.
    if (status === 'failure') return 'failed';

    const txKind = transaction.transaction?.data.transaction.kind;
    if (txKind !== 'ProgrammableTransaction') return 'system';

    return 'contract-call';
}

function derivePrimary(
    balanceChangesByOwner: BalanceChangeSummary,
    perspective: string | undefined,
): { coinType: string; amount: bigint } | undefined {
    if (!balanceChangesByOwner || !perspective) return undefined;
    const ownChanges = balanceChangesByOwner[perspective];
    if (!ownChanges?.length) return undefined;

    return ownChanges.reduce<{ coinType: string; amount: bigint } | undefined>((best, change) => {
        const amount = BigInt(change.amount);
        const absAmount = amount < 0n ? -amount : amount;

        if (!best) return { coinType: change.coinType, amount };

        const bestAbs = best.amount < 0n ? -best.amount : best.amount;
        if (absAmount > bestAbs) return { coinType: change.coinType, amount };
        // IOTA wins ties
        if (absAmount === bestAbs && change.coinType === IOTA_TYPE_ARG) {
            return { coinType: change.coinType, amount };
        }
        return best;
    }, undefined);
}

function deriveCounterparties(
    balanceChangesByOwner: BalanceChangeSummary,
    perspective: string | undefined,
    kind: TransactionKind,
): TransactionDisplay['counterparties'] {
    if (!balanceChangesByOwner) return [];

    // For receives the non-self owners are senders; for everything else they are recipients.
    const direction: 'to' | 'from' = kind === 'receive' ? 'from' : 'to';

    return Object.entries(balanceChangesByOwner)
        .filter(([owner]) => owner !== perspective && owner !== 'Shared')
        .map(([address, changes]) => ({
            direction,
            address,
            amounts: changes.map((c) => ({ coinType: c.coinType, amount: BigInt(c.amount) })),
        }));
}

/**
 * Pure function that maps a raw `IotaTransactionBlockResponse` (or a `DryRunTransactionBlockResponse`)
 * to a structured view-model used by all transaction detail UIs (wallet, dashboard, explorer).
 *
 * @param transaction         - The raw RPC response or dry-run response.
 * @param objectChangesWithDisplay - Object changes already enriched with on-chain Display data.
 * @param recognizedPackagesList   - Package IDs treated as "recognised tokens" (affects badge).
 * @param currentAddress           - The logged-in address; when absent, uses the tx sender.
 */
export function buildTransactionDisplay(
    transaction: IotaTransactionBlockResponse | DryRunTransactionBlockResponse,
    objectChangesWithDisplay: IotaObjectChangeWithDisplay[],
    recognizedPackagesList: string[],
    currentAddress?: string,
): TransactionDisplay {
    const effects = transaction.effects;
    const status = (effects?.status.status ?? 'failure') as 'success' | 'failure';

    // Normalize the fields that differ between confirmed and dry-run responses.
    const sender = isDryRun(transaction)
        ? transaction.input.sender
        : transaction.transaction?.data.sender;
    const txData = isDryRun(transaction)
        ? transaction.input.transaction
        : transaction.transaction?.data.transaction;

    // Use currentAddress when present; fall back to tx sender for a neutral (explorer) view.
    const perspective = currentAddress ?? sender;

    let kind: TransactionKind;
    if (isDryRun(transaction)) {
        // Dry-run: we don't have the full effects to classify action — infer from shape.
        if (status === 'failure') {
            kind = 'failed';
        } else if (txData?.kind === 'ProgrammableTransaction') {
            kind = 'contract-call';
        } else {
            kind = 'system';
        }
    } else {
        const action = getTransactionAction(transaction, currentAddress);
        kind = deriveKind(action, transaction, status);
    }

    const balanceChangesByOwner = getBalanceChangeSummary(transaction, recognizedPackagesList);
    const primary = derivePrimary(balanceChangesByOwner, perspective);
    const counterparties = deriveCounterparties(balanceChangesByOwner, perspective, kind);

    const gas = getGasSummary(transaction);
    const gasUsed = gas?.gasUsed;
    const fee = gasUsed
        ? {
              computation: BigInt(gasUsed.computationCost),
              storage: BigInt(gasUsed.storageCost),
              rebate: BigInt(gasUsed.storageRebate),
              net:
                  BigInt(gasUsed.computationCost) +
                  BigInt(gasUsed.storageCost) -
                  BigInt(gasUsed.storageRebate),
          }
        : undefined;

    const narratedObjectChanges = narrateObjectChanges(objectChangesWithDisplay, {
        currentAddress,
        sender,
        gasObjectId: effects?.gasObject?.reference.objectId,
    });

    const ptbRecognition =
        txData?.kind === 'ProgrammableTransaction'
            ? recognizePtbEffects({
                  commands: txData.transactions,
                  inputs: txData.inputs,
                  objectChangesWithDisplay,
                  balanceChanges: transaction.balanceChanges ?? [],
                  perspective: perspective ?? '',
                  recognizedPackages: recognizedPackagesList,
              })
            : undefined;

    return {
        kind,
        status,
        failureMessage: status === 'failure' ? (effects?.status.error ?? undefined) : undefined,
        timestampMs: !isDryRun(transaction) ? (transaction.timestampMs ?? undefined) : undefined,
        digest: !isDryRun(transaction) ? transaction.digest : undefined,
        sender,
        counterparties,
        primary,
        fee,
        balanceChangesByOwner,
        narratedObjectChanges,
        ptbRecognition,
    };
}
