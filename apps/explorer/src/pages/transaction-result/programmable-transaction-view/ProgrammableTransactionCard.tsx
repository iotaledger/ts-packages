// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Panel, Title } from '@iota/apps-ui-kit';
import { Info } from '@iota/apps-ui-icons';
import { useLocalStorage } from '@iota/core';
import { type IotaCallArg, type IotaTransaction } from '@iota/iota-sdk/client';
import { FilterList, RawJsonContent, RawJsonToggle } from '~/components/ui';
import { InputsTable } from './InputsTable';
import { CommandsList } from './CommandsList';

const PTB_VIEWS = ['Combined', 'Inputs + Commands'] as const;
type PtbView = (typeof PTB_VIEWS)[number];

function HoverHint({ children }: { children: string }): JSX.Element {
    return (
        <div className="mb-xs flex items-center gap-xxs text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
            <Info className="h-3.5 w-3.5" />
            {children}
        </div>
    );
}

interface ProgrammableTransactionCardProps {
    inputs: IotaCallArg[];
    transactions: IotaTransaction[];
}

export function ProgrammableTransactionCard({
    inputs,
    transactions,
}: ProgrammableTransactionCardProps): JSX.Element | null {
    const [view, setView] = useLocalStorage<PtbView>('ptb-view-mode', 'Combined');
    const [showRaw, setShowRaw] = useState(false);

    if (!transactions?.length) {
        return null;
    }

    return (
        <Panel hasBorder>
            <div className="flex w-full items-center justify-between gap-sm py-sm--rs">
                <Title
                    title="Programmable Tx"
                    subtitle={`${inputs.length} Inputs | ${transactions.length} Commands`}
                />
                <div className="flex items-center gap-xs pr-md--rs">
                    <FilterList
                        options={PTB_VIEWS}
                        selected={view}
                        onSelected={(next) => setView(next)}
                        disabled={showRaw}
                    />
                    <RawJsonToggle
                        name="ptb-raw-json-toggle"
                        isActive={showRaw}
                        onChange={setShowRaw}
                    />
                </div>
            </div>
            {showRaw ? (
                <RawJsonContent rawData={{ inputs, transactions }} />
            ) : (
                <div className="flex flex-col gap-lg pb-lg pt-xs">
                    {view === 'Inputs + Commands' && (
                        <div className="flex flex-col gap-xs">
                            <Title title="Inputs" />
                            <div className="px-md--rs">
                                <HoverHint>
                                    Hover the input number to highlight every place it appears
                                </HoverHint>
                                <InputsTable inputs={inputs} />
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col gap-xs">
                        {view === 'Inputs + Commands' && <Title title="Commands" />}
                        <div className="px-md--rs">
                            <HoverHint>
                                {view === 'Combined'
                                    ? 'Hover an argument to see its input and highlight every place it appears'
                                    : 'Hover an input to highlight every place it appears'}
                            </HoverHint>
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
