// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react';
import { type IotaCallArg, type IotaTransaction } from '@iota/iota-sdk/client';
import { TypeTagSerializer, type TypeTag } from '@iota/iota-sdk/bcs';
import { formatAddress, normalizeIotaAddress, toBase64 } from '@iota/iota-sdk/utils';
import {
    Badge,
    BadgeType,
    ButtonSegment,
    ButtonSegmentType,
    KeyValueInfo,
    Panel,
    SegmentedButton,
    SegmentedButtonType,
    Title,
    TitleSize,
} from '@iota/apps-ui-kit';
import { Collapsible } from '../collapsible';
import { type RenderExplorerLink } from '../../types';
import { ExplorerLinkType } from '../../enums';
import { formatPureInputValue, getPureValueTypeLabel } from '../../utils/transaction/pureValueType';

// ---------------------------------------------------------------------------
// Argument serialisation helpers
// ---------------------------------------------------------------------------

function convertArgToString(arg: unknown): string | null {
    if (arg === null || arg === undefined) return null;
    if (typeof arg === 'string' || typeof arg === 'number') return String(arg);

    if (typeof arg === 'object') {
        if ('None' in (arg as object)) return null;
        if ('Some' in (arg as object)) {
            const some = (arg as { Some: unknown }).Some;
            if (typeof some === 'object' && some !== null) {
                return TypeTagSerializer.tagToString(some as TypeTag);
            }
            return String(some);
        }
        if (Array.isArray(arg)) {
            return `[${arg.map(convertArgToString).filter(Boolean).join(', ')}]`;
        }
        // SDK $kind format
        if ('$kind' in (arg as object)) {
            const k = (arg as { $kind: string }).$kind;
            switch (k) {
                case 'GasCoin':
                    return 'GasCoin';
                case 'Input':
                    return `Input(${(arg as { Input: number }).Input})`;
                case 'Result':
                    return `Result(${(arg as { Result: number }).Result})`;
                case 'NestedResult': {
                    const [a, b] = (arg as { NestedResult: [number, number] }).NestedResult;
                    return `NestedResult(${a}, ${b})`;
                }
            }
        }
        // RPC format
        if ('GasCoin' in (arg as object)) return 'GasCoin';
        if ('Input' in (arg as object)) return `Input(${(arg as { Input: number }).Input})`;
        if ('Result' in (arg as object)) return `Result(${(arg as { Result: number }).Result})`;
        if ('NestedResult' in (arg as object)) {
            const [a, b] = (arg as { NestedResult: [number, number] }).NestedResult;
            return `NestedResult(${a}, ${b})`;
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Command renderer
// ---------------------------------------------------------------------------

function MonoValue({ children }: { children: React.ReactNode }) {
    return (
        <span className="break-all font-mono text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
            {children}
        </span>
    );
}

function CommandRow({ cmd, index }: { cmd: IotaTransaction; index: number }) {
    const [type, data] = Object.entries(cmd)[0] as [string, unknown];

    let content: React.ReactNode = null;

    if (type === 'MoveCall' && data && typeof data === 'object') {
        const mc = data as {
            package: string;
            module: string;
            function: string;
            arguments?: unknown[];
            type_arguments?: string[];
        };
        content = (
            <div className="flex flex-col gap-y-xxs">
                <KeyValueInfo
                    keyText="pkg"
                    value={<MonoValue>{formatAddress(normalizeIotaAddress(mc.package))}</MonoValue>}
                    fullwidth
                />
                <KeyValueInfo keyText="mod" value={<MonoValue>{mc.module}</MonoValue>} fullwidth />
                <KeyValueInfo keyText="fn" value={<MonoValue>{mc.function}</MonoValue>} fullwidth />
                {!!mc.arguments?.length && (
                    <KeyValueInfo
                        keyText="args"
                        value={
                            <MonoValue>
                                {mc.arguments.map(convertArgToString).filter(Boolean).join(', ')}
                            </MonoValue>
                        }
                        fullwidth
                    />
                )}
                {!!mc.type_arguments?.length && (
                    <KeyValueInfo
                        keyText="types"
                        value={<MonoValue>{mc.type_arguments.join(', ')}</MonoValue>}
                        fullwidth
                    />
                )}
            </div>
        );
    } else if (Array.isArray(data) && data.length > 0) {
        // Render each top-level argument on its own line.
        content = (
            <div className="flex flex-col gap-y-xxs">
                {data.map((arg, i) => (
                    <MonoValue key={i}>{convertArgToString(arg) ?? JSON.stringify(arg)}</MonoValue>
                ))}
            </div>
        );
    } else if (data !== null && data !== undefined && !Array.isArray(data)) {
        const s = convertArgToString(data);
        if (s) content = <MonoValue>{s}</MonoValue>;
    }

    return (
        <div className="flex gap-x-sm px-md py-sm">
            <span className="text-label-sm w-5 shrink-0 text-iota-neutral-50">{index}</span>
            <div className="flex min-w-0 flex-col gap-y-xs">
                <span className="text-label-md text-iota-neutral-10 dark:text-iota-neutral-92">
                    {type}
                </span>
                {content}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Input renderer
// ---------------------------------------------------------------------------

function formatInputValue(value: unknown, valueType: string | null | undefined): string {
    // Try normal formatting first (handles utf-8 decode for string types).
    const formatted = formatPureInputValue(value, valueType);

    // If the result still looks like a raw number array (fallback from failed UTF-8 decode),
    // show a compact byte-count label instead.
    if (Array.isArray(value) && formatted.startsWith('[') && formatted.includes(',')) {
        const byteCount = (value as unknown[]).length;
        try {
            // One more attempt: render as base64 if it's a small byte array.
            if (byteCount <= 64) {
                return toBase64(new Uint8Array(value as number[]));
            }
        } catch {
            // ignore
        }
        return `[${byteCount} bytes]`;
    }

    return formatted;
}

function InputRow({
    input,
    index,
    renderExplorerLink,
}: {
    input: IotaCallArg;
    index: number;
    renderExplorerLink: RenderExplorerLink;
}) {
    if (input.type === 'pure') {
        const keyText = getPureValueTypeLabel(input.valueType) || 'Pure';

        if (input.valueType === 'address') {
            const addr = String(input.value);
            return (
                <KeyValueInfo
                    keyText={keyText}
                    value={renderExplorerLink({
                        type: ExplorerLinkType.Address,
                        address: addr,
                        children: <span data-amp-mask>{formatAddress(addr)}</span>,
                    })}
                    fullwidth
                />
            );
        }

        const displayVal = formatInputValue(input.value, input.valueType);
        return <KeyValueInfo keyText={keyText} value={displayVal} fullwidth />;
    }

    if (input.type === 'object') {
        const { objectId } = input;
        return (
            <KeyValueInfo
                keyText="Object"
                value={renderExplorerLink({
                    type: ExplorerLinkType.Object,
                    objectID: objectId,
                    children: <span data-amp-mask>{formatAddress(objectId)}</span>,
                })}
                fullwidth
            />
        );
    }

    return <KeyValueInfo keyText={`Input ${index}`} value={toBase64(new Uint8Array())} fullwidth />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

enum Tab {
    Commands = 'Commands',
    Inputs = 'Inputs',
}

interface PtbRawCommandsProps {
    commands: IotaTransaction[];
    inputs: IotaCallArg[];
    renderExplorerLink: RenderExplorerLink;
}

export function PtbRawCommands({ commands, inputs, renderExplorerLink }: PtbRawCommandsProps) {
    const hasCommands = commands.length > 0;
    const hasInputs = inputs.length > 0;
    const [tab, setTab] = useState<Tab>(hasCommands ? Tab.Commands : Tab.Inputs);

    useEffect(() => {
        setTab(hasCommands ? Tab.Commands : Tab.Inputs);
    }, [hasCommands]);

    if (!hasCommands && !hasInputs) return null;

    const totalCount = commands.length + inputs.length;

    return (
        <Panel hasBorder>
            <div className="flex flex-col overflow-hidden rounded-xl">
                <Collapsible
                    hideBorder
                    defaultOpen={false}
                    render={() => (
                        <Title
                            size={TitleSize.Small}
                            title="Show raw commands"
                            trailingElement={
                                <div className="ml-1 flex">
                                    <Badge
                                        type={BadgeType.PrimarySoft}
                                        label={String(totalCount)}
                                    />
                                </div>
                            }
                        />
                    )}
                >
                    <div className="flex flex-col">
                        <div className="px-md pb-xs">
                            <SegmentedButton
                                type={SegmentedButtonType.Transparent}
                                shape={ButtonSegmentType.Underlined}
                            >
                                {hasCommands && (
                                    <ButtonSegment
                                        type={ButtonSegmentType.Underlined}
                                        label={`Commands (${commands.length})`}
                                        onClick={() => setTab(Tab.Commands)}
                                        selected={tab === Tab.Commands}
                                    />
                                )}
                                {hasInputs && (
                                    <ButtonSegment
                                        type={ButtonSegmentType.Underlined}
                                        label={`Inputs (${inputs.length})`}
                                        onClick={() => setTab(Tab.Inputs)}
                                        selected={tab === Tab.Inputs}
                                    />
                                )}
                            </SegmentedButton>
                        </div>

                        {tab === Tab.Commands && (
                            <div className="divide-y divide-iota-neutral-90 dark:divide-iota-neutral-20">
                                {commands.map((cmd, i) => (
                                    <CommandRow key={i} cmd={cmd} index={i} />
                                ))}
                            </div>
                        )}

                        {tab === Tab.Inputs && (
                            <div className="flex flex-col divide-y divide-iota-neutral-90 dark:divide-iota-neutral-20">
                                {inputs.map((inp, i) => (
                                    <div key={i} className="px-md py-sm" data-amp-mask>
                                        <InputRow
                                            input={inp}
                                            index={i}
                                            renderExplorerLink={renderExplorerLink}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Collapsible>
            </div>
        </Panel>
    );
}
