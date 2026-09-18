// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useRecognizedPackages, useTransactionSummary } from '@iota/core';
import type { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { CollapsibleCard } from '~/components/ui';
import { BalanceChanges } from './BalanceChanges';
import { ObjectChanges } from './ObjectChanges';
import { UpgradedSystemPackages } from './UpgradedSystemPackages';

interface TransactionChangesProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionSummary({ transaction }: TransactionChangesProps): JSX.Element {
    const recognizedPackagesList = useRecognizedPackages();
    const summary = useTransactionSummary({
        transaction,
        recognizedPackagesList,
    });

    const transactionKindName = transaction.transaction?.data.transaction.kind;
    const { balanceChanges, objectSummary, upgradedSystemPackages } = summary || {};

    return (
        <div className="flex flex-col gap-sm">
            <CollapsibleCard title="Changes" hideBorder rawData={{ balanceChanges, objectSummary }}>
                <div className="flex flex-col gap-lg pb-lg pt-xs">
                    {transactionKindName === 'ProgrammableTransaction' && (
                        <BalanceChanges changes={balanceChanges ?? null} />
                    )}
                    {objectSummary && <ObjectChanges objectSummary={objectSummary} />}
                </div>
            </CollapsibleCard>
            {upgradedSystemPackages && <UpgradedSystemPackages data={upgradedSystemPackages} />}
        </div>
    );
}
