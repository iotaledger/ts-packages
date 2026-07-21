// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { KeyValueInfo, TitleSize } from '@iota/apps-ui-kit';
import { ImageIcon, ImageIconSize, useAddressAliasLookup } from '@iota/core';
import { IotaLogoMark } from '@iota/apps-ui-icons';
import { type IotaCallArg } from '@iota/iota-sdk/client';
import { isValidIotaAddress, toHex } from '@iota/iota-sdk/utils';
import { ProgrammableTxnBlockCard, AddressLink, ObjectLink, CollapsibleCard } from '~/components';
import { useBreakpoint } from '~/hooks';
import { EVM_ADDRESS_LENGTH } from '~/lib/constants/evm.constants';

const REGEX_NUMBER = /^\d+$/;

interface InputsCardProps {
    inputs: IotaCallArg[];
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

function InputSupportingElement({ input }: { input: IotaCallArg }): JSX.Element | null {
    const getAddressAlias = useAddressAliasLookup();
    const address = getInputAddress(input);
    const addressAlias = address ? getAddressAlias(address) : null;

    if (!addressAlias) {
        return null;
    }

    return (
        <div className="ml-xs flex items-center gap-xs text-iota-neutral-40 dark:text-iota-neutral-60">
            {addressAlias.imageUrl ? (
                <ImageIcon
                    src={addressAlias.imageUrl}
                    label={addressAlias.alias}
                    fallback={addressAlias.alias}
                    size={ImageIconSize.Small}
                    rounded
                />
            ) : (
                <IotaLogoMark className="aspect-square h-full shrink-0" />
            )}
            <span>{addressAlias.alias}</span>
        </div>
    );
}

export function InputsCard({ inputs }: InputsCardProps): JSX.Element | null {
    const isMediumOrAbove = useBreakpoint('md');
    if (!inputs?.length) {
        return null;
    }

    const expandableItems = inputs.map((input, index) => (
        <CollapsibleCard
            key={index}
            title={`Input ${index}`}
            supportingTitleElement={<InputSupportingElement input={input} />}
            collapsible
            initialClose
            titleSize={TitleSize.Small}
        >
            <div
                data-testid="inputs-card-content"
                className="flex flex-col gap-2 px-md pb-lg pt-xs md:max-w-4xl"
            >
                {Object.entries(input).map(([key, value]) => {
                    let renderValue;
                    const stringValue = String(value);

                    if (key === 'mutable') {
                        renderValue = String(value);
                    } else if (key === 'objectId') {
                        renderValue = <ObjectLink objectId={stringValue} copyText={stringValue} />;
                    } else if (
                        'valueType' in input &&
                        'value' in input &&
                        input.valueType === 'address' &&
                        key === 'value'
                    ) {
                        renderValue = <AddressLink address={stringValue} copyText={stringValue} />;
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
                                if (hex.length == EVM_ADDRESS_LENGTH || isValidIotaAddress(hex)) {
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

                    return (
                        <KeyValueInfo
                            key={key}
                            keyText={key}
                            value={renderValue}
                            fullwidth={!isMediumOrAbove}
                        />
                    );
                })}
            </div>
        </CollapsibleCard>
    ));

    return (
        <ProgrammableTxnBlockCard
            items={expandableItems}
            itemsLabel="Inputs"
            rawData={inputs}
            defaultItemsToShow={4}
        />
    );
}
