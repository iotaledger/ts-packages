// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Panel, Title, Toggle, ToggleLabelPosition, ToggleSize } from '@iota/apps-ui-kit';
import { type IotaCallArg, type IotaTransaction } from '@iota/iota-sdk/client';
import { SyntaxHighlighter } from '~/components';
import { FilterList } from '~/components/ui';
import { InputsTable } from './InputsCard';
import { CommandsList } from './TransactionsCard';

const PTB_VIEWS = ['Combined', 'Inputs + Commands'] as const;
type PtbView = (typeof PTB_VIEWS)[number];

interface ProgrammableTransactionCardProps {
    inputs: IotaCallArg[];
    transactions: IotaTransaction[];
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
                <Title
                    title="Programmable Tx"
                    tooltipText={
                        view === 'Combined' && !showRaw
                            ? 'Hover an argument to see its input and highlight every place it appears. in n marks input n'
                            : undefined
                    }
                />
                <div className="flex items-center gap-xs pr-md--rs">
                    <FilterList
                        options={PTB_VIEWS}
                        selected={view}
                        onSelected={(next) => setView(next)}
                        disabled={showRaw}
                    />
                    <Toggle
                        name="ptb-raw-json-toggle"
                        label="Raw JSON"
                        labelPosition={ToggleLabelPosition.Left}
                        size={ToggleSize.Small}
                        isToggled={showRaw}
                        onChange={setShowRaw}
                    />
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
                    {view === 'Inputs + Commands' && (
                        <div className="flex flex-col gap-xs">
                            <Title
                                title="Inputs"
                                tooltipText="Hover the input number to highlight every place it appears"
                            />
                            <div className="px-md--rs">
                                <InputsTable inputs={inputs} transactions={transactions} />
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col gap-xs">
                        {view === 'Inputs + Commands' && (
                            <Title
                                title="Commands"
                                tooltipText="Hover an Input(n) or result reference to highlight where it comes from and every place it is used"
                            />
                        )}
                        <div className="px-md--rs">
                            <CommandsList
                                transactions={transactions}
                                inputs={inputs}
                                inputDisplay={view === 'Combined' ? 'value' : 'reference'}
                            />
                        </div>
                    </div>
                </div>
            )}
        </Panel>
    );
}
