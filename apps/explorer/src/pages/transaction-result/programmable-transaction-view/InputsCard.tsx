// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import {
    Badge,
    BadgeType,
    BadgeSize,
    Table,
    TableHeader,
    TableRow,
    TableHeaderCell,
    TableBody,
    Tooltip,
} from '@iota/apps-ui-kit';
import { Info } from '@iota/apps-ui-icons';
import clsx from 'clsx';
import { useGetObject } from '@iota/core';
import { type IotaCallArg, type IotaTransaction } from '@iota/iota-sdk/client';
import { formatDigest } from '@iota/iota-sdk/utils';
import { ObjectLink, AddressLink, ObjectVideoImage } from '~/components';
import { ExpandableValue } from './ExpandableValue';
import { CopyButton } from './Field';
import { REGEX_NUMBER, decodeVectorU8Value, pureValueHex, truncateMiddle } from './utils';
import { PtbIndexCell, usePtbHighlight } from './PtbHighlight';

interface InputsCardProps {
    inputs: IotaCallArg[];
    transactions: IotaTransaction[];
}

function InputTypeBadge({ input }: { input: IotaCallArg }): JSX.Element {
    if (input.type === 'pure') {
        return <Badge type={BadgeType.Neutral} label="pure" size={BadgeSize.Small} />;
    }

    if (input.objectType === 'sharedObject') {
        return (
            <Badge
                type={input.mutable ? BadgeType.Warning : BadgeType.Neutral}
                label={input.objectType}
                size={BadgeSize.Small}
            />
        );
    }

    if (input.objectType === 'receiving') {
        return <Badge type={BadgeType.Outlined} label={input.objectType} size={BadgeSize.Small} />;
    }

    return <Badge type={BadgeType.PrimarySoft} label={input.objectType} size={BadgeSize.Small} />;
}

function ObjectInputValue({ objectId }: { objectId: string }): JSX.Element {
    const { data } = useGetObject(objectId);
    const display = data?.data?.display?.data;

    if (display?.name) {
        return (
            <div className="flex min-w-0 items-center gap-xs">
                {display.image_url && (
                    <ObjectVideoImage
                        variant="xxs"
                        rounded="md"
                        title={display.name}
                        subtitle=""
                        src={display.image_url}
                        disablePreview
                    />
                )}
                <span className="truncate">{display.name}</span>
                <ObjectLink objectId={objectId} copyText={objectId} className="text-label-md" />
            </div>
        );
    }

    return <ObjectLink objectId={objectId} copyText={objectId} />;
}

function ValueTypeLabel({ valueType }: { valueType?: string | null }): JSX.Element | null {
    if (!valueType) {
        return null;
    }

    return (
        <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
            {valueType}
        </span>
    );
}

const RAW_BYTES_PREVIEW_LENGTH = 20;

function PureRawBytes({
    valueType,
    value,
}: {
    valueType?: string | null;
    value: unknown;
}): JSX.Element | null {
    if (!valueType) {
        return null;
    }

    const hex = pureValueHex(valueType, value);
    if (!hex) {
        return null;
    }

    return (
        <span className="flex min-w-0 max-w-full items-center gap-xxs text-body-sm">
            <span className="shrink-0 text-iota-neutral-40 dark:text-iota-neutral-60">
                {hex.length / 2}B
            </span>
            <span
                className="min-w-0 truncate text-iota-neutral-10 dark:text-iota-neutral-100"
                title={`0x${hex}`}
            >
                {truncateMiddle(`0x${hex}`, RAW_BYTES_PREVIEW_LENGTH)}
            </span>
            <CopyButton text={`0x${hex}`} />
        </span>
    );
}

function hasReadableDecoding(input: Extract<IotaCallArg, { type: 'pure' }>): boolean {
    if (input.valueType !== 'vector<u8>') {
        return true;
    }

    return decodeVectorU8Value(input.value).kind !== 'raw';
}

function DecodedPureValue({
    input,
}: {
    input: Extract<IotaCallArg, { type: 'pure' }>;
}): JSX.Element {
    const stringValue = String(input.value);

    if (input.valueType === 'address') {
        return <AddressLink address={stringValue} copyText={stringValue} />;
    }

    if (input.valueType === 'vector<u8>') {
        return (
            <span className="text-iota-neutral-10 dark:text-iota-neutral-92">
                <ExpandableValue value={decodeVectorU8Value(input.value).value} align="start" />
            </span>
        );
    }

    if (REGEX_NUMBER.test(stringValue)) {
        return (
            <span className="text-iota-neutral-10 dark:text-iota-neutral-92">
                {BigInt(stringValue).toLocaleString()}
            </span>
        );
    }

    return (
        <span className="text-iota-neutral-10 dark:text-iota-neutral-92">
            <ExpandableValue value={stringValue} align="start" />
        </span>
    );
}

function InputValueCell({ input }: { input: IotaCallArg }): JSX.Element {
    if (input.type === 'object') {
        return (
            <div className="flex flex-wrap items-center gap-xs">
                <ObjectInputValue objectId={input.objectId} />
                {'version' in input && (
                    <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                        v{input.version}
                    </span>
                )}
                {'initialSharedVersion' in input && (
                    <span className="text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                        shared@{input.initialSharedVersion}
                    </span>
                )}
                {'digest' in input && (
                    <span
                        className="flex items-center gap-xxs text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60"
                        title={input.digest}
                    >
                        <span>digest</span>
                        <span className="text-iota-neutral-10 dark:text-iota-neutral-92">
                            {formatDigest(input.digest)}
                        </span>
                        <CopyButton text={input.digest} />
                    </span>
                )}
            </div>
        );
    }

    const hasRawBytes = !!input.valueType && !!pureValueHex(input.valueType, input.value);

    return (
        <div className="flex min-w-0 flex-col gap-xxs">
            <PureRawBytes valueType={input.valueType} value={input.value} />
            {(!hasRawBytes || hasReadableDecoding(input)) && (
                <div className="flex flex-wrap items-center gap-xs">
                    <Tooltip text="Decoded from the raw BCS bytes using this input's declared type.">
                        <span className="flex items-center gap-xxs text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                            decoded
                            <Info className="h-3.5 w-3.5" />
                        </span>
                    </Tooltip>
                    <ValueTypeLabel valueType={input.valueType} />
                    <DecodedPureValue input={input} />
                </div>
            )}
        </div>
    );
}

const VISIBLE_INPUTS_LIMIT = 6;

function HighlightCell({
    highlighted,
    className,
    children,
}: {
    highlighted: boolean;
    className?: string;
    children: React.ReactNode;
}): JSX.Element {
    return (
        <td
            className={clsx(
                'h-14 border-b px-md py-xs',
                highlighted
                    ? 'border-transparent bg-iota-neutral-92 dark:bg-iota-neutral-12'
                    : 'table-cell-border-color',
                className,
            )}
        >
            {children}
        </td>
    );
}

function InputRow({ index, input }: { index: number; input: IotaCallArg }): JSX.Element {
    const { isHighlighted } = usePtbHighlight(`input-${index}`);
    const [isSelfHovered, setIsSelfHovered] = useState(false);
    const showRowHighlight = isHighlighted && !isSelfHovered;

    return (
        <tr>
            <HighlightCell highlighted={showRowHighlight}>
                <PtbIndexCell refId={`input-${index}`} onHoverChange={setIsSelfHovered}>
                    {index}
                </PtbIndexCell>
            </HighlightCell>
            <HighlightCell highlighted={showRowHighlight}>
                <InputTypeBadge input={input} />
            </HighlightCell>
            <HighlightCell highlighted={showRowHighlight} className="w-full max-w-0">
                <InputValueCell input={input} />
            </HighlightCell>
        </tr>
    );
}

const MAX_VISIBLE_TABLE_HEIGHT = (VISIBLE_INPUTS_LIMIT + 1) * 56;

export function InputsTable({ inputs }: InputsCardProps): JSX.Element | null {
    if (!inputs?.length) {
        return null;
    }

    const canScroll = inputs.length > VISIBLE_INPUTS_LIMIT;

    return (
        <div data-testid="inputs-card-content">
            <div
                style={canScroll ? { maxHeight: MAX_VISIBLE_TABLE_HEIGHT } : undefined}
                className={canScroll ? 'overflow-y-auto' : undefined}
            >
                <Table rowIndexes={inputs.map((_, index) => index)}>
                    <TableHeader>
                        <TableRow>
                            <TableHeaderCell columnKey="index" label="#" />
                            <TableHeaderCell columnKey="type" label="Type" />
                            <TableHeaderCell columnKey="value" label="Value" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {inputs.map((input, index) => (
                            <InputRow key={index} index={index} input={input} />
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
