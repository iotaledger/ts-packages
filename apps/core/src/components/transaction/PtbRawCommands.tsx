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
// Command renderer
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
            return `[${arg.map(convertArgToString).join(', ')}]`;
        }
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
        // RPC format: GasCoin is a string, Input/Result/NestedResult are plain objects
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

function renderArgList(args: unknown): string {
    if (!Array.isArray(args)) return convertArgToString(args) ?? '';
    return args.map(convertArgToString).filter(Boolean).join(', ');
}

function CommandRow({ cmd }: { cmd: IotaTransaction }) {
    const [type, data] = Object.entries(cmd)[0] as [string, unknown];

    let detail: string;
    if (type === 'MoveCall' && data && typeof data === 'object') {
        const mc = data as {
            package: string;
            module: string;
            function: string;
            arguments?: unknown[];
            type_arguments?: string[];
        };
        const parts = [
            `pkg: ${formatAddress(normalizeIotaAddress(mc.package))}`,
            `mod: ${mc.module}`,
            `fn: ${mc.function}`,
        ];
        if (mc.arguments?.length) parts.push(`args: ${renderArgList(mc.arguments)}`);
        if (mc.type_arguments?.length) parts.push(`types: [${mc.type_arguments.join(', ')}]`);
        detail = parts.join(', ');
    } else {
        detail = renderArgList(data);
    }

    return (
        <div className="flex flex-col gap-y-xs px-md py-xs">
            <span className="text-label-md text-neutral-40 dark:text-neutral-60">{type}</span>
            <span
                className="break-all text-body-sm text-neutral-60 dark:text-neutral-40"
                data-amp-mask
            >
                {detail}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Input renderer
// ---------------------------------------------------------------------------

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
                <div className="px-md py-xs">
                    <KeyValueInfo
                        keyText={keyText}
                        value={renderExplorerLink({
                            type: ExplorerLinkType.Address,
                            address: addr,
                            children: <span data-amp-mask>{formatAddress(addr)}</span>,
                        })}
                        fullwidth
                    />
                </div>
            );
        }
        const displayVal = formatPureInputValue(input.value, input.valueType);
        return (
            <div className="px-md py-xs">
                <KeyValueInfo keyText={keyText} value={displayVal} fullwidth />
            </div>
        );
    }

    if (input.type === 'object') {
        const { objectId } = input;
        return (
            <div className="px-md py-xs">
                <KeyValueInfo
                    keyText="Object"
                    value={renderExplorerLink({
                        type: ExplorerLinkType.Object,
                        objectID: objectId,
                        children: <span data-amp-mask>{formatAddress(objectId)}</span>,
                    })}
                    fullwidth
                />
            </div>
        );
    }

    return (
        <div className="px-md py-xs">
            <KeyValueInfo keyText={`Input ${index}`} value={toBase64(new Uint8Array())} fullwidth />
        </div>
    );
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
                            <SegmentedButton type={SegmentedButtonType.Transparent}>
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

                        {tab === Tab.Commands &&
                            commands.map((cmd, i) => <CommandRow key={i} cmd={cmd} />)}
                        {tab === Tab.Inputs &&
                            inputs.map((inp, i) => (
                                <InputRow
                                    key={i}
                                    input={inp}
                                    index={i}
                                    renderExplorerLink={renderExplorerLink}
                                />
                            ))}
                    </div>
                </Collapsible>
            </div>
        </Panel>
    );
}
