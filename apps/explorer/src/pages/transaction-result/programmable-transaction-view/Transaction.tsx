// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    type MoveCallIotaTransaction,
    type IotaArgument,
    type IotaMovePackage,
} from '@iota/iota-sdk/client';
import { KeyValueInfo } from '@iota/apps-ui-kit';
import { flattenIotaArguments } from './utils';
import { ErrorBoundary } from '~/components';
import { ObjectLink } from '~/components/ui';
import { useBreakpoint } from '~/hooks';
import { formatAddress } from '@iota/iota-sdk/utils';

interface TransactionProps<T> {
    type: string;
    data: T;
}

function ArrayArgument({
    data,
}: TransactionProps<(IotaArgument | IotaArgument[])[] | undefined>): JSX.Element {
    return (
        <>
            {data && (
                <span className="break-all text-body-md text-iota-neutral-40 dark:text-iota-neutral-60">
                    ({flattenIotaArguments(data)})
                </span>
            )}
        </>
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
