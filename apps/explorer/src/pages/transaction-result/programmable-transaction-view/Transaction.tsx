// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode } from 'react';
import {
    type IotaArgument,
    type IotaCallArg,
    type MoveCallIotaTransaction,
} from '@iota/iota-sdk/client';
import { useGetObject } from '@iota/core';
import { ErrorBoundary } from '~/components';
import { ObjectLink, AddressLink } from '~/components/ui';
import { formatAddress } from '@iota/iota-sdk/utils';
import { ExpandableValue } from './ExpandableValue';
import { ArgumentsBlock, StackedField } from './Field';
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

function ObjectInputArg({ objectId }: { objectId: string }): JSX.Element {
    const { data } = useGetObject(objectId);
    const objectNotFound = data?.error != null;

    if (objectNotFound) {
        return (
            <span className="break-all text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                {formatAddress(objectId)}
            </span>
        );
    }

    return <ObjectLink objectId={objectId} label={formatAddress(objectId)} copyText={objectId} />;
}

function InputArg({ input }: { input?: IotaCallArg }): JSX.Element {
    if (!input) {
        return (
            <span className="text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">—</span>
        );
    }

    if (input.type === 'object') {
        return <ObjectInputArg objectId={input.objectId} />;
    }

    if (input.type === 'pure' && input.valueType === 'address') {
        const address = String(input.value);
        return <AddressLink address={address} label={formatAddress(address)} copyText={address} />;
    }

    if (input.type === 'pure' && input.valueType === 'vector<u8>') {
        return (
            <span className="break-all text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                <ExpandableValue value={decodeVectorU8Value(input.value)} align="start" />
            </span>
        );
    }

    return (
        <span className="break-all text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
            <ExpandableValue value={String(input.value)} align="start" />
        </span>
    );
}

function argRows(args: IotaArgument[], inputs: IotaCallArg[]): ReactNode[] {
    return args.map((arg, index) => <Arg key={index} arg={arg} inputs={inputs} />);
}

function packageIdRows(packageIds: string[]): ReactNode[] {
    return packageIds.map((packageId) => (
        <ObjectLink
            key={packageId}
            objectId={packageId}
            label={formatAddress(packageId)}
            copyText={packageId}
        />
    ));
}

function Field({ keyText, value }: { keyText: string; value: ReactNode }): JSX.Element {
    return <StackedField keyText={keyText} value={value} />;
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
        <div className="flex flex-col divide-y divide-iota-neutral-92 dark:divide-iota-neutral-12">
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
            {args && args.length > 0 && (
                <ArgumentsBlock label="Arguments" rows={argRows(args, inputs)} />
            )}
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
        <div className="flex flex-col divide-y divide-iota-neutral-92 dark:divide-iota-neutral-12">
            <ArgumentsBlock label="Objects" rows={argRows(objects, inputs)} />
            <Field keyText="Recipient" value={<Arg arg={recipient} inputs={inputs} />} />
        </div>
    );
}

function SplitCoins({ data, inputs }: CommandProps<[IotaArgument, IotaArgument[]]>): JSX.Element {
    const [coin, amounts] = data;

    return (
        <div className="flex flex-col divide-y divide-iota-neutral-92 dark:divide-iota-neutral-12">
            <Field keyText="Coin" value={<Arg arg={coin} inputs={inputs} />} />
            <ArgumentsBlock label="Amounts" rows={argRows(amounts, inputs)} />
        </div>
    );
}

function MergeCoins({ data, inputs }: CommandProps<[IotaArgument, IotaArgument[]]>): JSX.Element {
    const [destinationCoin, coins] = data;

    return (
        <div className="flex flex-col divide-y divide-iota-neutral-92 dark:divide-iota-neutral-12">
            <Field keyText="Into Coin" value={<Arg arg={destinationCoin} inputs={inputs} />} />
            <ArgumentsBlock label="Coins" rows={argRows(coins, inputs)} />
        </div>
    );
}

function MakeMoveVec({ data, inputs }: CommandProps<[string | null, IotaArgument[]]>): JSX.Element {
    const [type, elements] = data;

    return (
        <div className="flex flex-col divide-y divide-iota-neutral-92 dark:divide-iota-neutral-12">
            <Field keyText="Type" value={type ?? 'Inferred'} />
            <ArgumentsBlock label="Elements" rows={argRows(elements, inputs)} />
        </div>
    );
}

function Publish({ data }: CommandProps<string[]>): JSX.Element {
    return (
        <div className="flex flex-col divide-y divide-iota-neutral-92 dark:divide-iota-neutral-12">
            <Field keyText="Modules" value={data.length} />
            {data.length > 0 && <ArgumentsBlock label="Dependencies" rows={packageIdRows(data)} />}
        </div>
    );
}

function Upgrade({ data, inputs }: CommandProps<[string[], string, IotaArgument]>): JSX.Element {
    const [dependencies, packageId, ticket] = data;

    return (
        <div className="flex flex-col divide-y divide-iota-neutral-92 dark:divide-iota-neutral-12">
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
                <ArgumentsBlock label="Dependency Packages" rows={packageIdRows(dependencies)} />
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
