// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { InfoBox, InfoBoxStyle, InfoBoxType } from '@iota/apps-ui-kit';
import { CheckmarkFilled, Warning } from '@iota/apps-ui-icons';
import { getUserFriendlyDryRunExecutionError } from '@iota/core';
import type { IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { TransactionActionSummary } from './TransactionActionSummary';

interface TransactionStatusHeroProps {
    transaction: IotaTransactionBlockResponse;
}

export function TransactionStatusHero({
    transaction,
}: TransactionStatusHeroProps): JSX.Element | null {
    const status = transaction.effects?.status.status;
    if (!status) return null;

    const isSuccess = status === 'success';
    const executionError = transaction.effects?.status.error;
    const errorText = executionError
        ? getUserFriendlyDryRunExecutionError(executionError)
        : undefined;

    return (
        <div className="flex flex-col items-center gap-sm p-lg">
            <div
                className={
                    isSuccess
                        ? 'flex items-center justify-center rounded-full bg-success-surface p-sm text-on-success'
                        : 'flex items-center justify-center rounded-full bg-error-surface p-sm text-on-error'
                }
            >
                {isSuccess ? (
                    <CheckmarkFilled className="size-8" />
                ) : (
                    <Warning className="size-8" />
                )}
            </div>
            <span
                className={
                    isSuccess
                        ? 'text-title-md text-iota-tertiary-30 dark:text-iota-tertiary-80'
                        : 'text-title-md text-iota-error-30 dark:text-iota-error-80'
                }
            >
                {isSuccess ? 'Success' : 'Failed'}
            </span>
            {errorText && (
                <InfoBox title={errorText} type={InfoBoxType.Error} style={InfoBoxStyle.Elevated} />
            )}
            <TransactionActionSummary transaction={transaction} />
        </div>
    );
}
