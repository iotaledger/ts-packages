// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeSize, BadgeType, Tooltip } from '@iota/apps-ui-kit';
import { type IotaArgument, type IotaCallArg } from '@iota/iota-sdk/client';
import { formatAddress } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import { ObjectLink, AddressLink } from '~/components/ui';
import { decodeVectorU8ValueDetailed, pureValueHex } from './utils';
import { HighlightableRef, type PtbRefId } from './PtbHighlight';

const RESULT_BADGE_TYPE = BadgeType.Neutral;
const INPUT_BADGE_TYPE = BadgeType.Outlined;

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

function ObjectInputArg({ objectId }: { objectId: string }): JSX.Element {
    return <ObjectLink objectId={objectId} label={formatAddress(objectId)} copyText={objectId} />;
}

function InlineInputValue({ input }: { input?: IotaCallArg }): JSX.Element {
    if (!input) {
        return <span className="text-iota-neutral-40 dark:text-iota-neutral-60">—</span>;
    }

    if (input.type === 'object') {
        return <ObjectInputArg objectId={input.objectId} />;
    }

    if (input.type === 'pure' && input.valueType === 'address') {
        const address = String(input.value);
        return <AddressLink address={address} label={formatAddress(address)} copyText={address} />;
    }

    const valueColor = 'text-iota-neutral-10 dark:text-iota-neutral-92';

    if (input.type === 'pure' && input.valueType === 'vector<u8>') {
        const { value: decoded, isPlainText } = decodeVectorU8ValueDetailed(input.value);
        const hex = pureValueHex(input.valueType, input.value);
        const isRawBytes = !isPlainText && decoded === String(input.value) && hex;
        const truncated = isRawBytes
            ? truncateEnd(`0x${hex}`)
            : isPlainText
              ? truncateEnd(decoded)
              : truncateMiddle(decoded);
        return <span className={clsx('break-all', valueColor)}>{truncated}</span>;
    }

    const stringValue = String(input.value);
    const isNumber = REGEX_NUMBER.test(stringValue);
    const truncated = isNumber ? truncateMiddle(stringValue) : truncateEnd(stringValue);
    return <span className={clsx('break-all', valueColor)}>{truncated}</span>;
}

function InputIndexLabel({ index }: { index: number }): JSX.Element {
    return (
        <sub className="text-[10px] leading-none text-iota-neutral-40 dark:text-iota-neutral-60">
            in{index}
        </sub>
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

export type InputDisplay = 'value' | 'reference';

export function Arg({
    arg,
    inputs,
    inputDisplay = 'value',
}: {
    arg: IotaArgument;
    inputs: IotaCallArg[];
    inputDisplay?: InputDisplay;
}): JSX.Element {
    if (arg === 'GasCoin') {
        return <Badge type={INPUT_BADGE_TYPE} label="Gas" size={BadgeSize.Small} />;
    }

    if ('Result' in arg) {
        return (
            <HighlightableRef refId={argRefId(arg)}>
                <Badge
                    type={RESULT_BADGE_TYPE}
                    label={`result of #${arg.Result}`}
                    size={BadgeSize.Small}
                />
            </HighlightableRef>
        );
    }

    if ('NestedResult' in arg) {
        const [commandIndex, resultIndex] = arg.NestedResult;
        return (
            <HighlightableRef refId={argRefId(arg)}>
                <Badge
                    type={RESULT_BADGE_TYPE}
                    label={`result of #${commandIndex}[${resultIndex}]`}
                    size={BadgeSize.Small}
                />
            </HighlightableRef>
        );
    }

    if (inputDisplay === 'reference') {
        return (
            <HighlightableRef refId={argRefId(arg)}>
                <Badge
                    type={INPUT_BADGE_TYPE}
                    label={`Input(${arg.Input})`}
                    size={BadgeSize.Small}
                />
            </HighlightableRef>
        );
    }

    const input = inputs[arg.Input];
    const tooltipText = inputTooltipText(input, arg.Input);
    const value = (
        <HighlightableRef refId={argRefId(arg)}>
            <span className="inline-flex items-baseline gap-[3px]">
                <InputIndexLabel index={arg.Input} />
                <InlineInputValue input={input} />
            </span>
        </HighlightableRef>
    );

    return tooltipText ? <Tooltip text={tooltipText}>{value}</Tooltip> : value;
}

export function ArgCommaList({
    args,
    inputs,
    inputDisplay,
}: {
    args: IotaArgument[];
    inputs: IotaCallArg[];
    inputDisplay?: InputDisplay;
}): JSX.Element {
    return (
        <span className="inline-flex w-max flex-nowrap items-baseline whitespace-nowrap">
            {args.map((arg, index) => (
                <span key={index} className="inline-flex items-center">
                    {index > 0 && (
                        <span className="mr-xs text-iota-neutral-40 dark:text-iota-neutral-60">
                            ,
                        </span>
                    )}
                    <Arg arg={arg} inputs={inputs} inputDisplay={inputDisplay} />
                </span>
            ))}
        </span>
    );
}
