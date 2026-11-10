// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Badge, BadgeSize, BadgeType, ButtonUnstyled, Tooltip } from '@iota/apps-ui-kit';
import { useGetDefaultIotaName } from '@iota/core';
import { type IotaArgument, type IotaCallArg } from '@iota/iota-sdk/client';
import { formatAddress } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import { NameTag, AddressLink } from '~/components/ui';
import {
    REGEX_NUMBER,
    decodeVectorU8Value,
    pureValueHex,
    truncateEnd,
    truncateMiddle,
} from './utils';
import { HighlightableBadge, HighlightableRef, usePtbRevealedRows } from './PtbHighlight';

const RESULT_BADGE_TYPE = BadgeType.Neutral;
const INPUT_BADGE_TYPE = BadgeType.Outlined;

function ObjectInputArg({ objectId }: { objectId: string }): JSX.Element {
    return <NameTag id={objectId} isObject label={formatAddress(objectId)} copyable />;
}

function AddressInputArg({ address }: { address: string }): JSX.Element {
    const { data: iotaName } = useGetDefaultIotaName(address);

    return (
        <AddressLink
            address={address}
            label={iotaName || formatAddress(address)}
            copyText={address}
            showAddressAlias={false}
        />
    );
}

function InlineInputValue({ input }: { input?: IotaCallArg }): JSX.Element {
    if (!input) {
        return <span className="text-iota-neutral-40 dark:text-iota-neutral-60">—</span>;
    }

    if (input.type === 'object') {
        return <ObjectInputArg objectId={input.objectId} />;
    }

    if (input.type === 'pure' && input.valueType === 'address') {
        return <AddressInputArg address={String(input.value)} />;
    }

    const valueColor = 'text-iota-neutral-10 dark:text-iota-neutral-92';

    if (input.type === 'pure' && input.valueType === 'vector<u8>') {
        const { value: decoded, kind } = decodeVectorU8Value(input.value);
        const hex = pureValueHex(input.valueType, input.value);
        const truncated =
            kind === 'raw' && hex
                ? truncateEnd(`0x${hex}`)
                : kind === 'text'
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

    return `Input #${index} · ${input.valueType ?? 'pure'}`;
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
            <HighlightableBadge
                refId={`command-${arg.Result}`}
                type={RESULT_BADGE_TYPE}
                label={`result of #${arg.Result}`}
            />
        );
    }

    if ('NestedResult' in arg) {
        const [commandIndex, resultIndex] = arg.NestedResult;
        return (
            <HighlightableBadge
                refId={`command-${commandIndex}`}
                type={RESULT_BADGE_TYPE}
                label={`result of #${commandIndex}[${resultIndex}]`}
            />
        );
    }

    if (inputDisplay === 'reference') {
        return (
            <HighlightableBadge
                refId={`input-${arg.Input}`}
                type={INPUT_BADGE_TYPE}
                label={`Input(${arg.Input})`}
            />
        );
    }

    const input = inputs[arg.Input];
    const tooltipText = inputTooltipText(input, arg.Input);
    const value = (
        <HighlightableRef refId={`input-${arg.Input}`}>
            <span className="inline-flex items-baseline gap-[3px]">
                <InputIndexLabel index={arg.Input} />
                <InlineInputValue input={input} />
            </span>
        </HighlightableRef>
    );

    return tooltipText ? <Tooltip text={tooltipText}>{value}</Tooltip> : value;
}

const PUNCTUATION = 'text-iota-neutral-40 dark:text-iota-neutral-60';

function CollapsibleRows({ children }: { children: React.ReactNode }): JSX.Element {
    const rowsId = useId();
    const containerRef = useRef<HTMLSpanElement>(null);
    const [isExpandedByUser, setIsExpandedByUser] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const { isRevealed, clearRevealed } = usePtbRevealedRows(rowsId);
    const isExpanded = isExpandedByUser || isRevealed;

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (container && !isExpanded) {
            container.scrollTop = 0;
            setIsOverflowing(container.scrollHeight > container.clientHeight);
        }
    }, [children, isExpanded]);

    return (
        <span className="inline-flex min-w-0 flex-col items-start gap-xxs">
            <span
                ref={containerRef}
                data-collapsed-rows={isExpanded ? undefined : rowsId}
                className={clsx(
                    'flex flex-wrap items-center gap-y-xxs',
                    isExpanded ? 'max-h-[150px] overflow-y-auto' : 'max-h-[52px] overflow-hidden',
                )}
            >
                {children}
            </span>
            {isOverflowing && (
                <ButtonUnstyled
                    className="text-label-sm text-iota-primary-30 dark:text-iota-primary-80"
                    onClick={() => {
                        if (isExpanded) {
                            setIsExpandedByUser(false);
                            clearRevealed();
                        } else {
                            setIsExpandedByUser(true);
                        }
                    }}
                >
                    {isExpanded ? 'Show Less' : 'Show More'}
                </ButtonUnstyled>
            )}
        </span>
    );
}

export function BracketedArgList({
    args,
    inputs,
    inputDisplay,
}: {
    args: IotaArgument[];
    inputs: IotaCallArg[];
    inputDisplay?: InputDisplay;
}): JSX.Element {
    if (args.length === 0) {
        return <span className={PUNCTUATION}>[]</span>;
    }

    return (
        <CollapsibleRows>
            {args.map((arg, index) => (
                <span key={index} className="inline-flex h-6 items-center whitespace-nowrap">
                    {index === 0 && <span className={clsx('mr-[2px]', PUNCTUATION)}>[</span>}
                    <Arg arg={arg} inputs={inputs} inputDisplay={inputDisplay} />
                    {index === args.length - 1 ? (
                        <span className={clsx('ml-[2px]', PUNCTUATION)}>]</span>
                    ) : (
                        <span className={clsx('mr-xs', PUNCTUATION)}>,</span>
                    )}
                </span>
            ))}
        </CollapsibleRows>
    );
}
