// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    useGetTransaction,
    getTransactionAction,
    ACTION_LABELS,
    TransactionIcon,
    TransactionIconSize,
} from '@iota/core';
import { type IotaTransactionBlockResponse } from '@iota/iota-sdk/client';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { ErrorBoundary, PageLayout, SyntaxHighlighter } from '~/components';
import { PageHeader } from '~/components/ui';
import { TransactionView } from './TransactionView';
import {
    InfoBox,
    InfoBoxType,
    InfoBoxStyle,
    Panel,
    Toggle,
    ToggleLabelPosition,
} from '@iota/apps-ui-kit';
import { Warning } from '@iota/apps-ui-icons';

interface TransactionResultPageHeaderProps {
    transaction?: IotaTransactionBlockResponse;
    error?: string;
    loading?: boolean;
    showRawJson: boolean;
    onRawJsonChange: (isToggled: boolean) => void;
}

function TransactionResultPageHeader({
    transaction,
    error,
    loading,
    showRawJson,
    onRawJsonChange,
}: TransactionResultPageHeaderProps): JSX.Element {
    const txnKindName = transaction?.transaction?.data.transaction?.kind;
    const txnStatus = transaction?.effects?.status.status;

    const isProgrammableTransaction = txnKindName === 'ProgrammableTransaction';

    const sender = transaction?.transaction?.data.sender;
    const txnAction =
        transaction && isProgrammableTransaction
            ? getTransactionAction(transaction, sender)
            : undefined;
    const txnDigest = transaction?.digest ?? '';

    return (
        <PageHeader
            loading={loading}
            type="Transaction"
            title={txnDigest}
            subtitle={!isProgrammableTransaction ? txnKindName : undefined}
            typeBadge={
                txnAction && (
                    <div
                        className={
                            txnStatus === 'failure'
                                ? 'flex items-center gap-xxs rounded-full border border-error-surface bg-error-surface px-sm py-xxs'
                                : 'badge-bg-color-primary-soft badge-border-color-soft flex items-center gap-xxs rounded-full border px-sm py-xxs'
                        }
                    >
                        <TransactionIcon
                            variant={txnAction}
                            size={TransactionIconSize.Small}
                            txnFailed={txnStatus === 'failure'}
                        />
                        <span
                            className={
                                txnStatus === 'failure'
                                    ? 'text-label-md text-on-error'
                                    : 'badge-text-color-primary-soft text-label-md'
                            }
                        >
                            {ACTION_LABELS[txnAction]}
                        </span>
                    </div>
                )
            }
            after={
                transaction && (
                    <div className="flex w-full justify-end">
                        <Toggle
                            name="raw-json-toggle"
                            label="Raw JSON"
                            labelPosition={ToggleLabelPosition.Left}
                            isToggled={showRawJson}
                            onChange={(isToggled) => onRawJsonChange(isToggled)}
                        />
                    </div>
                )
            }
            error={error}
        />
    );
}

export function TransactionResult(): JSX.Element {
    const { id } = useParams();
    const {
        isPending,
        isError: getTxnErrorBool,
        data,
        error: getTxnError,
    } = useGetTransaction(id as string);
    const txnQueryErrorMessage = getTxnError?.message;
    const [showRawJson, setShowRawJson] = useState(false);

    return (
        <PageLayout
            loading={isPending}
            content={
                <div className="flex flex-col gap-2xl">
                    <TransactionResultPageHeader
                        transaction={data}
                        error={txnQueryErrorMessage}
                        loading={isPending}
                        showRawJson={showRawJson}
                        onRawJsonChange={setShowRawJson}
                    />
                    {getTxnErrorBool || !data ? (
                        <InfoBox
                            title="Error extracting data"
                            supportingText={
                                !id
                                    ? "Can't search for a transaction without a digest"
                                    : `Data could not be extracted for the following specified transaction ID: ${id}`
                            }
                            icon={<Warning />}
                            type={InfoBoxType.Error}
                            style={InfoBoxStyle.Elevated}
                        />
                    ) : showRawJson ? (
                        <Panel>
                            <ErrorBoundary>
                                <div className="p-md--rs">
                                    <SyntaxHighlighter
                                        code={JSON.stringify(data, null, 2)}
                                        language="json"
                                    />
                                </div>
                            </ErrorBoundary>
                        </Panel>
                    ) : (
                        <TransactionView transaction={data} />
                    )}
                </div>
            }
        />
    );
}
