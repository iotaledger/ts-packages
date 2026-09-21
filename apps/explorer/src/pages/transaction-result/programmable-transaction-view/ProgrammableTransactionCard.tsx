// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { ButtonUnstyled, Panel, Title } from '@iota/apps-ui-kit';
import { type IotaCallArg, type IotaTransaction } from '@iota/iota-sdk/client';
import clsx from 'clsx';
import { SyntaxHighlighter } from '~/components';
import { FilterList } from '~/components/ui';
import { InputsTable } from './InputsCard';
import { CombinedCommandsList, TransactionsTable } from './TransactionsCard';

const PTB_VIEWS = ['Combined', 'Inputs + Transactions'] as const;
type PtbView = (typeof PTB_VIEWS)[number];

interface ProgrammableTransactionCardProps {
    inputs: IotaCallArg[];
    transactions: IotaTransaction[];
}

function RawJsonToggle({
    isActive,
    onToggle,
}: {
    isActive: boolean;
    onToggle: () => void;
}): JSX.Element {
    return (
        <ButtonUnstyled
            aria-label="Toggle raw JSON"
            onClick={onToggle}
            className={clsx(
                'shrink-0 rounded-full border px-xs py-xxs text-label-sm',
                isActive
                    ? 'badge-bg-color-primary-soft badge-border-color-soft badge-text-color-primary-soft'
                    : 'badge-border-color-neutral badge-text-color-neutral bg-transparent',
            )}
        >
            RAW
        </ButtonUnstyled>
    );
}

export function ProgrammableTransactionCard({
    inputs,
    transactions,
}: ProgrammableTransactionCardProps): JSX.Element | null {
    const [view, setView] = useState<PtbView>('Combined');
    const [showRaw, setShowRaw] = useState(false);

    if (!transactions?.length) {
        return null;
    }

    return (
        <Panel hasBorder>
            <div className="flex w-full items-center justify-between gap-sm py-sm--rs">
                <Title title="Programmable Tx" />
                <div className="flex items-center gap-xs pr-md--rs">
                    <FilterList
                        options={PTB_VIEWS}
                        selected={view}
                        onSelected={(next) => setView(next)}
                    />
                    <RawJsonToggle isActive={showRaw} onToggle={() => setShowRaw((v) => !v)} />
                </div>
            </div>
            {showRaw ? (
                <div className="p-md--rs pt-0">
                    <SyntaxHighlighter
                        code={JSON.stringify({ inputs, transactions }, null, 2)}
                        language="json"
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-lg pb-lg pt-xs">
                    {view === 'Inputs + Transactions' && (
                        <div className="flex flex-col gap-xs">
                            <Title title="Inputs" />
                            <div className="px-md--rs">
                                <InputsTable inputs={inputs} transactions={transactions} />
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col gap-xs">
                        {view === 'Inputs + Transactions' && <Title title="Transactions" />}
                        <div className="px-md--rs">
                            {view === 'Combined' ? (
                                <CombinedCommandsList transactions={transactions} inputs={inputs} />
                            ) : (
                                <TransactionsTable transactions={transactions} inputs={inputs} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Panel>
    );
}
