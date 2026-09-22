// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Tooltip } from '@iota/apps-ui-kit';
import { type IotaArgument, type IotaCallArg } from '@iota/iota-sdk/client';
import { formatAddress } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import { ObjectLink, AddressLink } from '~/components/ui';
import { decodeVectorU8ValueDetailed, pureValueHex } from './utils';
import { HighlightableRef, type PtbRefId } from './PtbHighlight';

const REGEX_NUMBER = /^\d+$/;

function truncateMiddle(value: string, max = 40): string {
    if (value.length <= max) {
        return value;
    }

    const head = Math.ceil((max - 1) / 2);
    const tail = Math.floor((max - 1) / 2);
    return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function truncateEnd(value: string, max = 40): string {
    if (value.length <= max) {
        return value;
    }

    return `${value.slice(0, max - 1)}…`;
}

function ResultPill({ children }: { children: React.ReactNode }): JSX.Element {
    return (
        <span className="whitespace-nowrap rounded-full bg-iota-neutral-92 px-xs py-[1px] text-label-sm text-iota-neutral-40 dark:bg-iota-neutral-12 dark:text-iota-neutral-60">
            {children}
        </span>
    );
}

function argRefId(arg: IotaArgument): PtbRefId | undefined {
    if (arg === 'GasCoin') {
        return undefined;
    }

    if ('Input' in arg) {
        return `input-${arg.Input}`;
    }

    if ('Result' in arg) {
        return `command-${arg.Result}`;
    }

    return `command-${arg.NestedResult[0]}`;
}

const TRANSACTION_ARGUMENT_VALUE_COLOR = '!text-iota-tertiary-40 dark:!text-iota-tertiary-70';

function ObjectInputArg({ objectId, muted }: { objectId: string; muted: boolean }): JSX.Element {
    return (
        <ObjectLink
            objectId={objectId}
            label={formatAddress(objectId)}
            copyText={objectId}
            className={muted ? undefined : TRANSACTION_ARGUMENT_VALUE_COLOR}
        />
    );
}

function InlineInputValue({
    input,
    muted = false,
}: {
    input?: IotaCallArg;
    muted?: boolean;
}): JSX.Element {
    if (!input) {
        return <span className="text-iota-neutral-40 dark:text-iota-neutral-60">—</span>;
    }

    if (input.type === 'object') {
        return <ObjectInputArg objectId={input.objectId} muted={muted} />;
    }

    if (input.type === 'pure' && input.valueType === 'address') {
        const address = String(input.value);
        return (
            <AddressLink
                address={address}
                label={formatAddress(address)}
                copyText={address}
                className={muted ? undefined : TRANSACTION_ARGUMENT_VALUE_COLOR}
            />
        );
    }

    const valueColor = muted
        ? 'text-iota-neutral-10 dark:text-iota-neutral-92'
        : 'text-iota-tertiary-40 dark:text-iota-tertiary-70';

    if (input.type === 'pure' && input.valueType === 'vector<u8>') {
        const { value: decoded, isPlainText } = decodeVectorU8ValueDetailed(input.value);
        const truncated = isPlainText ? truncateEnd(decoded) : truncateMiddle(decoded);
        return <span className={clsx('break-all', valueColor)}>{truncated}</span>;
    }

    const stringValue = String(input.value);
    const isNumber = REGEX_NUMBER.test(stringValue);
    const truncated = isNumber ? truncateMiddle(stringValue) : truncateEnd(stringValue);
    return <span className={clsx('break-all', valueColor)}>{truncated}</span>;
}

function InputIndexLabel({ index }: { index: number }): JSX.Element {
    return (
        <span className="text-[10px] leading-none text-iota-neutral-40 dark:text-iota-neutral-60">
            #{index}
        </span>
    );
}

function inputTooltipText(input: IotaCallArg | undefined, index: number): string | undefined {
    if (!input) {
        return undefined;
    }

    if (input.type === 'object') {
        return `Input #${index} · ${input.objectType}`;
    }

    const hex = input.valueType ? pureValueHex(input.valueType, input.value) : null;
    return hex ? `Input #${index} · pure · 0x${hex}` : `Input #${index} · pure`;
}

export function Arg({
    arg,
    inputs,
    showInputIndex = false,
    muted = false,
}: {
    arg: IotaArgument;
    inputs: IotaCallArg[];
    showInputIndex?: boolean;
    muted?: boolean;
}): JSX.Element {
    if (arg === 'GasCoin') {
        return <ResultPill>Gas</ResultPill>;
    }

    if ('Result' in arg) {
        return (
            <HighlightableRef refId={argRefId(arg)}>
                <ResultPill>result of #{arg.Result}</ResultPill>
            </HighlightableRef>
        );
    }

    if ('NestedResult' in arg) {
        const [commandIndex, resultIndex] = arg.NestedResult;
        return (
            <HighlightableRef refId={argRefId(arg)}>
                <ResultPill>
                    result of #{commandIndex}[{resultIndex}]
                </ResultPill>
            </HighlightableRef>
        );
    }

    const input = inputs[arg.Input];
    const tooltipText = muted ? undefined : inputTooltipText(input, arg.Input);
    const value = (
        <HighlightableRef refId={argRefId(arg)}>
            <span className="inline-flex items-baseline gap-[3px]">
                {showInputIndex && <InputIndexLabel index={arg.Input} />}
                <InlineInputValue input={input} muted={muted} />
            </span>
        </HighlightableRef>
    );

    return tooltipText ? <Tooltip text={tooltipText}>{value}</Tooltip> : value;
}

export function ArgCommaList({
    args,
    inputs,
    nowrap = false,
    showInputIndex = false,
    muted = false,
}: {
    args: IotaArgument[];
    inputs: IotaCallArg[];
    nowrap?: boolean;
    showInputIndex?: boolean;
    muted?: boolean;
}): JSX.Element {
    if (args.length === 0) {
        return <span className="text-iota-neutral-40 dark:text-iota-neutral-60">—</span>;
    }

    return (
        <div
            className={clsx(
                'flex items-baseline',
                nowrap ? 'w-max flex-nowrap whitespace-nowrap' : 'w-full flex-wrap gap-y-xxs',
            )}
        >
            {args.map((arg, index) => (
                <div key={index} className="flex items-center">
                    {index > 0 && (
                        <span className="mr-xs text-iota-neutral-40 dark:text-iota-neutral-60">
                            ,
                        </span>
                    )}
                    <Arg arg={arg} inputs={inputs} showInputIndex={showInputIndex} muted={muted} />
                </div>
            ))}
        </div>
    );
}
