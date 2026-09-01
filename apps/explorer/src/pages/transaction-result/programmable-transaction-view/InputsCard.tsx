// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { ButtonUnstyled, KeyValueInfo, TitleSize } from '@iota/apps-ui-kit';
import { ImageIcon, ImageIconSize, useAddressAliasLookup, useGetObject } from '@iota/core';
import { IotaLogoMark } from '@iota/apps-ui-icons';
import { type IotaCallArg, type IotaTransaction } from '@iota/iota-sdk/client';
import { formatDigest, isValidIotaAddress, toHex } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import {
    ProgrammableTxnBlockCard,
    AddressLink,
    ObjectLink,
    ObjectVideoImage,
    CollapsibleCard,
} from '~/components';
import { useBreakpoint } from '~/hooks';
import { EVM_ADDRESS_LENGTH } from '~/lib/constants/evm.constants';
import { getCommandArguments } from './utils';

const REGEX_NUMBER = /^\d+$/;
const INPUT_VALUE_PREVIEW_LENGTH = 160;

interface InputsCardProps {
    inputs: IotaCallArg[];
    transactions: IotaTransaction[];
}

type ObjectCallArg = Extract<IotaCallArg, { type: 'object' }>;

function getObjectVersionInfo(
    input: ObjectCallArg,
): { version: string; digest: string } | { initialSharedVersion: string; mutable: boolean } {
    if (input.objectType === 'sharedObject') {
        return { initialSharedVersion: input.initialSharedVersion, mutable: input.mutable };
    }

    return { version: input.version, digest: input.digest };
}

function getUsedByCommands(inputIndex: number, transactions: IotaTransaction[]): number[] {
    return transactions.reduce<number[]>((usedBy, transaction, commandIndex) => {
        const [[type, data]] = Object.entries(transaction);
        const args = getCommandArguments(type, data);
        const usesInput = args.some(
            (arg) => typeof arg === 'object' && 'Input' in arg && arg.Input === inputIndex,
        );

        if (usesInput) {
            usedBy.push(commandIndex);
        }

        return usedBy;
    }, []);
}

function getInputAddress(input: IotaCallArg): string | undefined {
    if (input.type === 'object' && 'objectId' in input) {
        return input.objectId;
    }

    if (input.type === 'pure' && 'valueType' in input && input.valueType === 'address') {
        return String(input.value);
    }

    return undefined;
}

function ObjectInputSupportingElement({ input }: { input: ObjectCallArg }): JSX.Element {
    const objectId = input.objectId;
    const { data } = useGetObject(objectId);
    const display = data?.data?.display?.data;
    const versionInfo = getObjectVersionInfo(input);

    return (
        <div
            className="ml-xs flex min-w-0 flex-wrap items-center gap-xs text-label-md text-iota-neutral-40 dark:text-iota-neutral-60"
            onClick={(event) => event.stopPropagation()}
        >
            {display?.name ? (
                <>
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
                </>
            ) : (
                <div className="[&>div]:flex-row [&>div]:items-center [&>div]:gap-xs">
                    <ObjectLink objectId={objectId} copyText={objectId} className="text-label-md" />
                </div>
            )}
            {'version' in versionInfo ? (
                <>
                    <span className="text-body-sm">v{versionInfo.version}</span>
                    <span className="text-body-sm">{formatDigest(versionInfo.digest)}</span>
                </>
            ) : (
                <span className="text-body-sm">
                    shared @ {versionInfo.initialSharedVersion}
                    {versionInfo.mutable ? '' : ' (read-only)'}
                </span>
            )}
        </div>
    );
}

function AddressInputSupportingElement({ address }: { address: string }): JSX.Element {
    const getAddressAlias = useAddressAliasLookup();
    const addressAlias = getAddressAlias(address);

    if (addressAlias) {
        return (
            <div className="ml-xs flex min-w-0 items-baseline gap-xs text-label-md text-iota-neutral-40 dark:text-iota-neutral-60">
                {addressAlias.imageUrl ? (
                    <ImageIcon
                        src={addressAlias.imageUrl}
                        label={addressAlias.alias}
                        fallback={addressAlias.alias}
                        size={ImageIconSize.Small}
                        rounded
                    />
                ) : (
                    <IotaLogoMark className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">{addressAlias.alias}</span>
            </div>
        );
    }

    return (
        <div
            className="ml-xs flex min-w-0 items-baseline gap-xs text-label-md text-iota-neutral-40 dark:text-iota-neutral-60"
            onClick={(event) => event.stopPropagation()}
        >
            <AddressLink address={address} copyText={address} className="text-label-md" />
        </div>
    );
}

function InputSupportingElement({ input }: { input: IotaCallArg }): JSX.Element | null {
    const address = getInputAddress(input);

    if (!address) {
        return null;
    }

    return input.type === 'object' ? (
        <ObjectInputSupportingElement input={input} />
    ) : (
        <AddressInputSupportingElement address={address} />
    );
}

function ExpandableInputValue({ value }: { value: string }): JSX.Element {
    const [showFullValue, setShowFullValue] = useState(false);
    const isLongValue = value.length > INPUT_VALUE_PREVIEW_LENGTH;
    const displayedValue =
        !isLongValue || showFullValue
            ? value
            : `${value.slice(0, INPUT_VALUE_PREVIEW_LENGTH).trimEnd()}…`;

    if (!isLongValue) {
        return <>{value}</>;
    }

    return (
        <span className="flex max-w-full flex-col items-end gap-xxs text-right">
            <span
                className={clsx(
                    'break-all',
                    showFullValue &&
                        'max-h-48 overflow-y-auto rounded-md border border-iota-neutral-92 bg-transparent p-xs text-left dark:border-iota-neutral-12',
                )}
            >
                {displayedValue}
            </span>
            <ButtonUnstyled
                className="shrink-0 text-label-sm text-iota-primary-30 dark:text-iota-primary-80"
                onClick={() => setShowFullValue((isExpanded) => !isExpanded)}
            >
                {showFullValue ? 'Show Less' : 'Show More'}
            </ButtonUnstyled>
        </span>
    );
}

export function InputsCard({ inputs, transactions }: InputsCardProps): JSX.Element | null {
    const isMediumOrAbove = useBreakpoint('md');
    if (!inputs?.length) {
        return null;
    }

    const expandableItems = inputs.map((input, index) => {
        const usedByCommands = getUsedByCommands(index, transactions);

        return (
            <CollapsibleCard
                key={index}
                title={`Input ${index}`}
                supportingTitleElement={<InputSupportingElement input={input} />}
                collapsible
                compactHeader
                initialClose
                titleSize={TitleSize.Small}
            >
                <div
                    data-testid="inputs-card-content"
                    className="mx-auto flex w-full max-w-5xl flex-col gap-xs px-lg pb-lg pt-xs"
                >
                    {usedByCommands.length > 0 && (
                        <KeyValueInfo
                            layout="receipt"
                            keyText="Used by"
                            value={usedByCommands
                                .map((commandIndex) => `Command #${commandIndex}`)
                                .join(', ')}
                            fullwidth={!isMediumOrAbove}
                        />
                    )}
                    {Object.entries(input).map(([key, value]) => {
                        let renderValue;
                        const stringValue = String(value);

                        if (key === 'mutable') {
                            renderValue = String(value);
                        } else if (key === 'objectId') {
                            renderValue = (
                                <ObjectLink objectId={stringValue} copyText={stringValue} />
                            );
                        } else if (key === 'digest') {
                            renderValue = formatDigest(stringValue);
                        } else if (
                            'valueType' in input &&
                            'value' in input &&
                            input.valueType === 'address' &&
                            key === 'value'
                        ) {
                            renderValue = (
                                <AddressLink address={stringValue} copyText={stringValue} />
                            );
                        } else if (REGEX_NUMBER.test(stringValue)) {
                            const bigNumber = BigInt(stringValue);
                            renderValue = bigNumber.toLocaleString();
                        } else if (
                            'valueType' in input &&
                            'value' in input &&
                            input.valueType === 'vector<u8>' &&
                            key === 'value'
                        ) {
                            let parsedVector: Array<number> | null = null;
                            try {
                                parsedVector = JSON.parse(`[${stringValue}]`);
                            } catch (_) {
                                // Silent error
                            }

                            let parsedUtf: string | null = null;
                            try {
                                parsedUtf = new TextDecoder('utf-8', {
                                    fatal: true,
                                }).decode(new Uint8Array(parsedVector ?? []));
                            } catch (_) {
                                // Silent error
                            }

                            let parsedAddress: string | null = null;
                            try {
                                if (parsedVector) {
                                    const hex = toHex(new Uint8Array(parsedVector));
                                    if (
                                        hex.length == EVM_ADDRESS_LENGTH ||
                                        isValidIotaAddress(hex)
                                    ) {
                                        parsedAddress = hex;
                                    }
                                }
                            } catch (_) {
                                // Silent error
                            }

                            if (parsedUtf) {
                                renderValue = parsedUtf;
                            } else if (parsedAddress) {
                                renderValue = parsedAddress;
                            } else {
                                renderValue = stringValue;
                            }
                        } else {
                            renderValue = stringValue;
                        }

                        const displayedValue =
                            typeof renderValue === 'string' ? (
                                <ExpandableInputValue value={renderValue} />
                            ) : (
                                renderValue
                            );

                        return (
                            <KeyValueInfo
                                layout="receipt"
                                key={key}
                                keyText={key}
                                value={displayedValue}
                                fullwidth={!isMediumOrAbove}
                            />
                        );
                    })}
                </div>
            </CollapsibleCard>
        );
    });

    return (
        <ProgrammableTxnBlockCard items={expandableItems} itemsLabel="Inputs" rawData={inputs} />
    );
}
