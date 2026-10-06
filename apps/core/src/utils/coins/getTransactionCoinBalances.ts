// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    DryRunTransactionBlockResponse,
    IotaTransactionBlockResponse,
    ObjectOwner,
} from '@iota/iota-sdk/client';
import { IOTA_TYPE_ARG, normalizeStructTag } from '@iota/iota-sdk/utils';
import { CoinOwnerChanges, GasCostDetails, TransactionCoinBalances } from '../../interfaces';
import { getTotalGasUsed } from '../transaction/getGasSummary';
import { CoinOwnerType } from '../../enums';

type BalancesByOwner = Map<string, { ownerType: CoinOwnerType; amounts: Map<string, bigint> }>;

const IOTA_COIN_TYPE = normalizeStructTag(IOTA_TYPE_ARG);

export function getTransactionCoinBalances(
    transaction: IotaTransactionBlockResponse | DryRunTransactionBlockResponse,
): TransactionCoinBalances | null {
    if (!transaction.balanceChanges || !transaction.effects) return null;

    const coinBalancesByOwner: BalancesByOwner = new Map();

    for (const balanceChange of transaction.balanceChanges) {
        const { owner, ownerType } = getBalanceChangeOwner(balanceChange.owner);
        const coinType =
            normalizeStructTag(balanceChange.coinType) === IOTA_COIN_TYPE
                ? IOTA_TYPE_ARG
                : normalizeStructTag(balanceChange.coinType);

        let transactionOwnerData = coinBalancesByOwner.get(owner);
        if (!transactionOwnerData) {
            transactionOwnerData = { ownerType, amounts: new Map() };
            coinBalancesByOwner.set(owner, transactionOwnerData);
        }
        transactionOwnerData.amounts.set(
            coinType,
            (transactionOwnerData.amounts.get(coinType) ?? 0n) + BigInt(balanceChange.amount),
        );
    }

    const transactionData =
        'input' in transaction ? transaction.input : transaction.transaction?.data;
    const sender = transactionData?.sender;
    const payer = transactionData?.gasData.owner;
    const gasAmount = getTotalGasUsed(transaction.effects);

    if (payer && gasAmount !== undefined) {
        removeGasFromPayer(coinBalancesByOwner, payer, gasAmount);
    }

    const gas: GasCostDetails | null =
        payer && gasAmount !== undefined
            ? { payer, amount: gasAmount, isSponsored: payer !== sender }
            : null;

    const owners: CoinOwnerChanges[] = [...coinBalancesByOwner]
        .map(([owner, { ownerType, amounts }]) => ({
            owner,
            ownerType,
            changes: [...amounts]
                .filter(([, amount]) => amount !== 0n)
                .map(([coinType, amount]) => ({ coinType, amount })),
        }))
        .filter(({ changes }) => changes.length > 0);

    return { sender, owners, gas };
}

function removeGasFromPayer(
    coinBalancesByOwner: BalancesByOwner,
    payer: string,
    gasAmount: bigint,
) {
    const payerEntry = coinBalancesByOwner.get(payer);
    if (!payerEntry) return;

    payerEntry.amounts.set(
        IOTA_TYPE_ARG,
        (payerEntry.amounts.get(IOTA_TYPE_ARG) ?? 0n) + gasAmount,
    );
}

function getBalanceChangeOwner(objectOwner: ObjectOwner): {
    owner: string;
    ownerType: CoinOwnerType;
} {
    if (objectOwner === 'Immutable') {
        return { owner: 'Immutable', ownerType: CoinOwnerType.Immutable };
    }
    if ('AddressOwner' in objectOwner) {
        return { owner: objectOwner.AddressOwner, ownerType: CoinOwnerType.Address };
    }
    if ('ObjectOwner' in objectOwner) {
        return { owner: objectOwner.ObjectOwner, ownerType: CoinOwnerType.Object };
    }
    return { owner: 'Shared', ownerType: CoinOwnerType.Shared };
}
