// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { TitleSize } from '@iota/apps-ui-kit';
import { ImageIcon, ImageIconSize, useAddressAliasLookup, useGetObject } from '@iota/core';
import { IotaLogoMark } from '@iota/apps-ui-icons';
import { type IotaCallArg, type IotaTransaction } from '@iota/iota-sdk/client';
import {
    ProgrammableTxnBlockCard,
    AddressLink,
    ObjectLink,
    ObjectVideoImage,
    CollapsibleCard,
} from '~/components';
import { ExpandableValue } from './ExpandableValue';
import { StackedField } from './Field';
import { decodeVectorU8Value, getCommandArguments } from './utils';

const REGEX_NUMBER = /^\d+$/;

interface InputsCardProps {
    inputs: IotaCallArg[];
    transactions: IotaTransaction[];
}

interface InputConsumer {
    commandIndex: number;
    type: string;
}

function getUsedByCommands(inputIndex: number, transactions: IotaTransaction[]): InputConsumer[] {
    return transactions.reduce<InputConsumer[]>((usedBy, transaction, commandIndex) => {
        const [[type, data]] = Object.entries(transaction);
        const args = getCommandArguments(type, data);
        const usesInput = args.some(
            (arg) => typeof arg === 'object' && 'Input' in arg && arg.Input === inputIndex,
        );

        if (usesInput) {
            usedBy.push({ commandIndex, type });
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

function ObjectInputSupportingElement({ objectId }: { objectId: string }): JSX.Element {
    const { data } = useGetObject(objectId);
    const display = data?.data?.display?.data;

    return (
        <div
            className="ml-xs flex min-w-0 items-center gap-xs text-label-md text-iota-neutral-40 dark:text-iota-neutral-60"
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
        <ObjectInputSupportingElement objectId={address} />
    ) : (
        <AddressInputSupportingElement address={address} />
    );
}

export function InputsCard({ inputs, transactions }: InputsCardProps): JSX.Element | null {
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
                    className="mx-auto flex w-full max-w-5xl flex-col divide-y divide-iota-neutral-92 px-lg pb-lg pt-xs dark:divide-iota-neutral-12"
                >
                    {usedByCommands.length > 0 && (
                        <StackedField
                            keyText="Used by"
                            value={usedByCommands
                                .map(
                                    ({ commandIndex, type }) =>
                                        `Command #${commandIndex} (${type})`,
                                )
                                .join(', ')}
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
                            renderValue = decodeVectorU8Value(value);
                        } else {
                            renderValue = stringValue;
                        }

                        const displayedValue =
                            typeof renderValue === 'string' ? (
                                <ExpandableValue value={renderValue} align="start" />
                            ) : (
                                renderValue
                            );

                        return <StackedField key={key} keyText={key} value={displayedValue} />;
                    })}
                </div>
            </CollapsibleCard>
        );
    });

    return (
        <ProgrammableTxnBlockCard items={expandableItems} itemsLabel="Inputs" rawData={inputs} />
    );
}
