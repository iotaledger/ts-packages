// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode } from 'react';
import {
    type IotaArgument,
    type IotaCallArg,
    type MoveCallIotaTransaction,
} from '@iota/iota-sdk/client';
import { KeyValueInfo } from '@iota/apps-ui-kit';
import { ErrorBoundary } from '~/components';
import { ObjectLink, AddressLink } from '~/components/ui';
import { useBreakpoint } from '~/hooks';
import { formatAddress } from '@iota/iota-sdk/utils';
import { decodeVectorU8Value } from './utils';

interface TransactionProps<T> {
    type: string;
    data: T;
    inputs: IotaCallArg[];
}

interface CommandProps<T> {
    data: T;
    inputs: IotaCallArg[];
}

function Arg({ arg, inputs }: { arg: IotaArgument; inputs: IotaCallArg[] }): JSX.Element {
    if (arg === 'GasCoin') {
        return (
            <span className="text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                Gas Coin
            </span>
        );
    }

    if ('Input' in arg) {
        return <InputArg input={inputs[arg.Input]} />;
    }

    if ('Result' in arg) {
        return (
            <span className="text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                Result of Command #{arg.Result}
            </span>
        );
    }

    const [commandIndex, resultIndex] = arg.NestedResult;
    return (
        <span className="text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
            Result of Command #{commandIndex}[{resultIndex}]
        </span>
    );
}

function InputArg({ input }: { input?: IotaCallArg }): JSX.Element {
    if (!input) {
        return (
            <span className="text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">—</span>
        );
    }

    if (input.type === 'object') {
        return (
            <ObjectLink
                objectId={input.objectId}
                label={formatAddress(input.objectId)}
                copyText={input.objectId}
            />
        );
    }

    if (input.type === 'pure' && input.valueType === 'address') {
        const address = String(input.value);
        return <AddressLink address={address} label={formatAddress(address)} copyText={address} />;
    }

    if (input.type === 'pure' && input.valueType === 'vector<u8>') {
        return (
            <span className="break-all text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                {decodeVectorU8Value(input.value)}
            </span>
        );
    }

    return (
        <span className="break-all text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
            {String(input.value)}
        </span>
    );
}

function ArgList({ args, inputs }: { args: IotaArgument[]; inputs: IotaCallArg[] }): JSX.Element {
    return (
        <span className="flex flex-wrap items-center gap-x-xs">
            {args.map((arg, index) => (
                <span key={index} className="flex items-center gap-x-xs">
                    <Arg arg={arg} inputs={inputs} />
                    {index < args.length - 1 && (
                        <span className="text-iota-neutral-40 dark:text-iota-neutral-60">,</span>
                    )}
                </span>
            ))}
        </span>
    );
}

function PackageIdList({ packageIds }: { packageIds: string[] }): JSX.Element {
    return (
        <span className="flex flex-wrap items-center gap-x-xs">
            {packageIds.map((packageId, index) => (
                <span key={packageId} className="flex items-center gap-x-xs">
                    <ObjectLink
                        objectId={packageId}
                        label={formatAddress(packageId)}
                        copyText={packageId}
                    />
                    {index < packageIds.length - 1 && (
                        <span className="text-iota-neutral-40 dark:text-iota-neutral-60">,</span>
                    )}
                </span>
            ))}
        </span>
    );
}

function Field({ keyText, value }: { keyText: string; value: ReactNode }): JSX.Element {
    const isMediumOrAbove = useBreakpoint('md');
    return <KeyValueInfo keyText={keyText} value={value} fullwidth={!isMediumOrAbove} />;
}

function MoveCall({ data, inputs }: CommandProps<MoveCallIotaTransaction>): JSX.Element {
    const {
        module,
        package: movePackage,
        function: func,
        arguments: args,
        type_arguments: typeArgs,
    } = data;

    return (
        <div className="flex flex-col gap-xs">
            <Field
                keyText="Package"
                value={
                    <ObjectLink
                        objectId={movePackage}
                        label={formatAddress(movePackage)}
                        copyText={movePackage}
                    />
                }
            />
            <Field
                keyText="Module"
                value={
                    <ObjectLink
                        objectId={`${movePackage}?module=${module}`}
                        label={module}
                        showAddressAlias={false}
                    />
                }
            />
            <Field keyText="Function" value={func} />
            {args && <Field keyText="Arguments" value={<ArgList args={args} inputs={inputs} />} />}
            {typeArgs && <Field keyText="Type Arguments" value={typeArgs.join(', ')} />}
        </div>
    );
}

function TransferObjects({
    data,
    inputs,
}: CommandProps<[IotaArgument[], IotaArgument]>): JSX.Element {
    const [objects, recipient] = data;

    return (
        <div className="flex flex-col gap-xs">
            <Field keyText="Objects" value={<ArgList args={objects} inputs={inputs} />} />
            <Field keyText="Recipient" value={<Arg arg={recipient} inputs={inputs} />} />
        </div>
    );
}

function SplitCoins({ data, inputs }: CommandProps<[IotaArgument, IotaArgument[]]>): JSX.Element {
    const [coin, amounts] = data;

    return (
        <div className="flex flex-col gap-xs">
            <Field keyText="Coin" value={<Arg arg={coin} inputs={inputs} />} />
            <Field keyText="Amounts" value={<ArgList args={amounts} inputs={inputs} />} />
        </div>
    );
}

function MergeCoins({ data, inputs }: CommandProps<[IotaArgument, IotaArgument[]]>): JSX.Element {
    const [destinationCoin, coins] = data;

    return (
        <div className="flex flex-col gap-xs">
            <Field keyText="Into Coin" value={<Arg arg={destinationCoin} inputs={inputs} />} />
            <Field keyText="Coins" value={<ArgList args={coins} inputs={inputs} />} />
        </div>
    );
}

function MakeMoveVec({ data, inputs }: CommandProps<[string | null, IotaArgument[]]>): JSX.Element {
    const [type, elements] = data;

    return (
        <div className="flex flex-col gap-xs">
            <Field keyText="Type" value={type ?? 'Inferred'} />
            <Field keyText="Elements" value={<ArgList args={elements} inputs={inputs} />} />
        </div>
    );
}

function Publish({ data }: CommandProps<string[]>): JSX.Element {
    return (
        <div className="flex flex-col gap-xs">
            <Field keyText="Modules" value={data.length} />
            {data.length > 0 && (
                <Field keyText="Dependencies" value={<PackageIdList packageIds={data} />} />
            )}
        </div>
    );
}

function Upgrade({ data, inputs }: CommandProps<[string[], string, IotaArgument]>): JSX.Element {
    const [dependencies, packageId, ticket] = data;

    return (
        <div className="flex flex-col gap-xs">
            <Field
                keyText="Package"
                value={
                    <ObjectLink
                        objectId={packageId}
                        label={formatAddress(packageId)}
                        copyText={packageId}
                    />
                }
            />
            <Field keyText="Upgrade Ticket" value={<Arg arg={ticket} inputs={inputs} />} />
            <Field keyText="Dependencies" value={dependencies.length} />
            {dependencies.length > 0 && (
                <Field
                    keyText="Dependency Packages"
                    value={<PackageIdList packageIds={dependencies} />}
                />
            )}
        </div>
    );
}

export function Transaction({ type, data, inputs }: TransactionProps<unknown>): JSX.Element | null {
    switch (type) {
        case 'MoveCall':
            return (
                <ErrorBoundary>
                    <MoveCall data={data as MoveCallIotaTransaction} inputs={inputs} />
                </ErrorBoundary>
            );
        case 'TransferObjects':
            return (
                <ErrorBoundary>
                    <TransferObjects
                        data={data as [IotaArgument[], IotaArgument]}
                        inputs={inputs}
                    />
                </ErrorBoundary>
            );
        case 'SplitCoins':
            return (
                <ErrorBoundary>
                    <SplitCoins data={data as [IotaArgument, IotaArgument[]]} inputs={inputs} />
                </ErrorBoundary>
            );
        case 'MergeCoins':
            return (
                <ErrorBoundary>
                    <MergeCoins data={data as [IotaArgument, IotaArgument[]]} inputs={inputs} />
                </ErrorBoundary>
            );
        case 'MakeMoveVec':
            return (
                <ErrorBoundary>
                    <MakeMoveVec data={data as [string | null, IotaArgument[]]} inputs={inputs} />
                </ErrorBoundary>
            );
        case 'Publish':
            return (
                <ErrorBoundary>
                    <Publish data={data as string[]} inputs={inputs} />
                </ErrorBoundary>
            );
        case 'Upgrade':
            return (
                <ErrorBoundary>
                    <Upgrade data={data as [string[], string, IotaArgument]} inputs={inputs} />
                </ErrorBoundary>
            );
        default:
            return null;
    }
}
