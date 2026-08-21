// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    type MoveCallIotaTransaction,
    type IotaArgument,
    type IotaMovePackage,
} from '@iota/iota-sdk/client';
import { type ComponentProps } from 'react';
import { KeyValueInfo as BaseKeyValueInfo } from '@iota/apps-ui-kit';
import { flattenIotaArguments } from './utils';
import { ErrorBoundary } from '~/components';
import { ObjectLink } from '~/components/ui';
import { useBreakpoint } from '~/hooks';
import { formatAddress } from '@iota/iota-sdk/utils';

interface TransactionProps<T> {
    type: string;
    data: T;
}

function KeyValueInfo(props: ComponentProps<typeof BaseKeyValueInfo>): JSX.Element {
    return <BaseKeyValueInfo {...props} layout="receipt" />;
}

const TRANSACTION_ARGUMENT_LABELS: Record<string, string[]> = {
    SplitCoins: ['Coin', 'Amounts'],
    TransferObjects: ['Objects', 'Recipient'],
    MergeCoins: ['Destination Coin', 'Coins to Merge'],
    MakeMoveVec: ['Type', 'Elements'],
    Upgrade: ['Modules', 'Package', 'Ticket'],
};

type DisplayArgument = IotaArgument | DisplayArgument[];

function formatArgument(value: DisplayArgument): string {
    return Array.isArray(value)
        ? `[${value.map((item) => formatArgument(item)).join(', ')}]`
        : flattenIotaArguments([value]);
}

function ArrayArgument({
    type,
    data,
}: TransactionProps<(IotaArgument | IotaArgument[])[] | undefined>): JSX.Element {
    const values = type === 'Publish' && data ? [data] : data;
    const labels = type === 'Publish' ? ['Modules'] : TRANSACTION_ARGUMENT_LABELS[type];
    const isMediumOrAbove = useBreakpoint('md');

    return (
        <div className="flex flex-col gap-xs">
            {values?.map((value, index) => (
                <KeyValueInfo
                    key={index}
                    keyText={labels?.[index] ?? `Argument ${index + 1}`}
                    value={formatArgument(value)}
                    fullwidth={!isMediumOrAbove}
                />
            ))}
        </div>
    );
}

function MoveCall({ data }: TransactionProps<MoveCallIotaTransaction>): JSX.Element {
    const {
        module,
        package: movePackage,
        function: func,
        arguments: args,
        type_arguments: typeArgs,
    } = data;
    const isMediumOrAbove = useBreakpoint('md');

    return (
        <div className="flex flex-col gap-xs">
            <KeyValueInfo
                keyText="Package"
                value={
                    <ObjectLink
                        objectId={movePackage}
                        label={formatAddress(movePackage)}
                        copyText={movePackage}
                    />
                }
                fullwidth={!isMediumOrAbove}
            />
            <KeyValueInfo
                keyText="Module"
                value={
                    <ObjectLink
                        objectId={`${movePackage}?module=${module}`}
                        label={module}
                        showAddressAlias={false}
                    />
                }
                fullwidth={!isMediumOrAbove}
            />
            <KeyValueInfo keyText="Function" value={func} fullwidth={!isMediumOrAbove} />
            {args && (
                <KeyValueInfo
                    keyText="Arguments"
                    value={`[${flattenIotaArguments(args)}]`}
                    fullwidth={!isMediumOrAbove}
                />
            )}
            {typeArgs && (
                <KeyValueInfo
                    keyText="Type Arguments"
                    value={typeArgs.join(', ')}
                    fullwidth={!isMediumOrAbove}
                />
            )}
        </div>
    );
}

export function Transaction({
    type,
    data,
}: TransactionProps<
    (IotaArgument | IotaArgument[])[] | MoveCallIotaTransaction | IotaMovePackage
>): JSX.Element {
    if (type === 'MoveCall') {
        return (
            <ErrorBoundary>
                <MoveCall type={type} data={data as MoveCallIotaTransaction} />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <ArrayArgument type={type} data={data as (IotaArgument | IotaArgument[])[]} />
        </ErrorBoundary>
    );
}
