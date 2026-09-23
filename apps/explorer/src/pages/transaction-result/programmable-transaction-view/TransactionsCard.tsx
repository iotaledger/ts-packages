// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Badge, BadgeType, BadgeSize } from '@iota/apps-ui-kit';
import {
    type IotaArgument,
    type IotaTransaction,
    type IotaCallArg,
    type MoveCallIotaTransaction,
} from '@iota/iota-sdk/client';
import { formatAddress } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import { ObjectLink } from '~/components/ui';
import { ArgCommaList, type InputDisplay } from './Transaction';
import { getResultUsedByCommands } from './utils';
import { HighlightableRef, usePtbHighlight } from './PtbHighlight';

interface CommandsListProps {
    transactions: IotaTransaction[];
    inputs: IotaCallArg[];
    inputDisplay: InputDisplay;
}

const MUTED_TEXT = 'text-iota-neutral-40 dark:text-iota-neutral-60';
const ADDRESS_REGEX = /0x[0-9a-fA-F]{64}/g;

function formatTypeTag(typeTag: string): string {
    return typeTag.replace(ADDRESS_REGEX, (address) => formatAddress(address));
}

function IndexCell({ index }: { index: number }): JSX.Element {
    const { onMouseEnter, onMouseLeave } = usePtbHighlight(`command-${index}`);

    return (
        <span
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="cursor-pointer select-none text-label-sm text-iota-neutral-60 dark:text-iota-neutral-40"
        >
            #{index}
        </span>
    );
}

function MoveCallSignature({ data }: { data: MoveCallIotaTransaction }): JSX.Element {
    const { package: movePackage, module, function: func, type_arguments: typeArgs } = data;

    return (
        <span className="inline-flex flex-wrap items-baseline">
            <ObjectLink
                objectId={movePackage}
                label={formatAddress(movePackage)}
                showAddressAlias={false}
            />
            <span className={MUTED_TEXT}>::</span>
            <ObjectLink
                objectId={`${movePackage}?module=${module}`}
                label={module}
                showAddressAlias={false}
            />
            <span className={MUTED_TEXT}>::</span>
            <span className="font-medium text-iota-neutral-10 dark:text-iota-neutral-92">
                {func}
            </span>
            {!!typeArgs?.length && (
                <span className={MUTED_TEXT}>&lt;{typeArgs.map(formatTypeTag).join(', ')}&gt;</span>
            )}
        </span>
    );
}

function CommandSignature({ type, data }: { type: string; data: unknown }): JSX.Element | null {
    if (type === 'MoveCall') {
        return <MoveCallSignature data={data as MoveCallIotaTransaction} />;
    }

    if (type === 'MakeMoveVec') {
        const [elementType] = data as [string | null, IotaArgument[]];
        return elementType ? (
            <span className={MUTED_TEXT}>&lt;{formatTypeTag(elementType)}&gt;</span>
        ) : null;
    }

    if (type === 'Upgrade') {
        const [, packageId] = data as [string[], string, IotaArgument];
        return (
            <ObjectLink
                objectId={packageId}
                label={formatAddress(packageId)}
                showAddressAlias={false}
            />
        );
    }

    return null;
}

function Bracketed({
    args,
    inputs,
    inputDisplay,
}: {
    args: IotaArgument[];
    inputs: IotaCallArg[];
    inputDisplay: InputDisplay;
}): JSX.Element {
    return (
        <span className="inline-flex items-center gap-[2px]">
            <span className={MUTED_TEXT}>[</span>
            {args.length > 0 && (
                <ArgCommaList args={args} inputs={inputs} inputDisplay={inputDisplay} />
            )}
            <span className={MUTED_TEXT}>]</span>
        </span>
    );
}

function Keyword({ children }: { children: string }): JSX.Element {
    return <span className={MUTED_TEXT}>{children}</span>;
}

function CommandBody({
    type,
    data,
    inputs,
    inputDisplay,
}: {
    type: string;
    data: unknown;
    inputs: IotaCallArg[];
    inputDisplay: InputDisplay;
}): JSX.Element | null {
    const list = (args: IotaArgument[]) => (
        <Bracketed args={args} inputs={inputs} inputDisplay={inputDisplay} />
    );

    switch (type) {
        case 'MoveCall':
            return (
                <>
                    <Keyword>args:</Keyword>
                    {list((data as MoveCallIotaTransaction).arguments ?? [])}
                </>
            );
        case 'MergeCoins': {
            const [destination, sources] = data as [IotaArgument, IotaArgument[]];
            return (
                <>
                    <Keyword>merge</Keyword>
                    {list(sources)}
                    <Keyword>into</Keyword>
                    {list([destination])}
                </>
            );
        }
        case 'SplitCoins': {
            const [coin, amounts] = data as [IotaArgument, IotaArgument[]];
            return (
                <>
                    <Keyword>split</Keyword>
                    {list([coin])}
                    <Keyword>into amounts</Keyword>
                    {list(amounts)}
                </>
            );
        }
        case 'TransferObjects': {
            const [objects, recipient] = data as [IotaArgument[], IotaArgument];
            return (
                <>
                    <Keyword>transfer</Keyword>
                    {list(objects)}
                    <Keyword>to</Keyword>
                    {list([recipient])}
                </>
            );
        }
        case 'MakeMoveVec': {
            const [, elements] = data as [string | null, IotaArgument[]];
            return (
                <>
                    <Keyword>elements:</Keyword>
                    {list(elements)}
                </>
            );
        }
        case 'Upgrade': {
            const [modules, , ticket] = data as [string[], string, IotaArgument];
            return (
                <>
                    <Keyword>{`${modules.length} modules · ticket:`}</Keyword>
                    {list([ticket])}
                </>
            );
        }
        case 'Publish': {
            const modules = data as string[];
            return <Keyword>{`${modules.length} modules`}</Keyword>;
        }
        default:
            return null;
    }
}

function UsedBy({ usedBy }: { usedBy: ReturnType<typeof getResultUsedByCommands> }): JSX.Element {
    const commandIndexes = [...new Set(usedBy.map(({ commandIndex }) => commandIndex))];

    return (
        <span className={clsx('inline-flex items-center text-body-sm', MUTED_TEXT)}>
            <span className="mr-xs">used by</span>
            {commandIndexes.map((commandIndex, i) => (
                <span key={commandIndex} className="inline-flex items-center">
                    {i > 0 && <span className="mr-xs">,</span>}
                    <HighlightableRef refId={`command-${commandIndex}`}>
                        #{commandIndex}
                    </HighlightableRef>
                </span>
            ))}
        </span>
    );
}

function CommandCard({
    index,
    transaction,
    transactions,
    inputs,
    inputDisplay,
}: {
    index: number;
    transaction: IotaTransaction;
    transactions: IotaTransaction[];
    inputs: IotaCallArg[];
    inputDisplay: InputDisplay;
}): JSX.Element {
    const { isHighlighted } = usePtbHighlight(`command-${index}`);
    const [[type, data]] = Object.entries(transaction);
    const usedBy = getResultUsedByCommands(index, transactions);

    return (
        <div
            data-testid="command-card"
            className={clsx(
                'flex flex-col gap-xxs rounded-lg border px-md--rs py-sm--rs',
                isHighlighted
                    ? 'border-transparent bg-iota-neutral-92 dark:bg-iota-neutral-12'
                    : 'table-cell-border-color',
            )}
        >
            <div className="flex flex-wrap items-center gap-xs text-body-sm">
                <IndexCell index={index} />
                <Badge type={BadgeType.PrimarySoft} label={type} size={BadgeSize.Small} />
                <CommandSignature type={type} data={data} />
                {usedBy.length > 0 && <UsedBy usedBy={usedBy} />}
            </div>
            <div className="overflow-x-auto pl-lg text-body-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max items-baseline gap-x-xs whitespace-nowrap">
                    <CommandBody
                        type={type}
                        data={data}
                        inputs={inputs}
                        inputDisplay={inputDisplay}
                    />
                </div>
            </div>
        </div>
    );
}

export function CommandsList({
    transactions,
    inputs,
    inputDisplay,
}: CommandsListProps): JSX.Element | null {
    if (!transactions?.length) {
        return null;
    }

    return (
        <div data-testid="commands-content" className="flex flex-col gap-xs">
            {transactions.map((transaction, index) => (
                <CommandCard
                    key={index}
                    index={index}
                    transaction={transaction}
                    transactions={transactions}
                    inputs={inputs}
                    inputDisplay={inputDisplay}
                />
            ))}
        </div>
    );
}
