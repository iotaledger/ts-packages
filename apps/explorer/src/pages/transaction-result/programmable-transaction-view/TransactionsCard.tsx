// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    Badge,
    BadgeType,
    BadgeSize,
    Table,
    TableHeader,
    TableRow,
    TableHeaderCell,
    TableBody,
} from '@iota/apps-ui-kit';
import { Info } from '@iota/apps-ui-icons';
import {
    type IotaTransaction,
    type IotaCallArg,
    type MoveCallIotaTransaction,
} from '@iota/iota-sdk/client';
import { formatAddress } from '@iota/iota-sdk/utils';
import clsx from 'clsx';
import { ObjectLink } from '~/components/ui';
import { ArgCommaList } from './Transaction';
import { getCommandArguments, getResultUsedByCommands } from './utils';
import { HighlightableRef, usePtbHighlight } from './PtbHighlight';

interface TransactionsCardProps {
    transactions: IotaTransaction[];
    inputs: IotaCallArg[];
}

function Dash(): JSX.Element {
    return <span className="text-iota-neutral-40 dark:text-iota-neutral-60">—</span>;
}

function IndexCell({ index }: { index: number }): JSX.Element {
    const { onMouseEnter, onMouseLeave } = usePtbHighlight(`command-${index}`);

    return (
        <span
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="cursor-pointer select-none text-label-sm text-iota-neutral-60 dark:text-iota-neutral-40"
        >
            {index}
        </span>
    );
}

const MUTED_COLOR = '!text-iota-neutral-40 dark:!text-iota-neutral-60';
const HIGHLIGHT_COLOR = '!text-iota-tertiary-40 dark:!text-iota-tertiary-70';

function PackageCell({
    type,
    data,
    muted = false,
}: {
    type: string;
    data: unknown;
    muted?: boolean;
}): JSX.Element {
    const className = muted ? MUTED_COLOR : HIGHLIGHT_COLOR;

    if (type === 'MoveCall') {
        const { package: movePackage } = data as MoveCallIotaTransaction;
        return (
            <ObjectLink
                objectId={movePackage}
                label={formatAddress(movePackage)}
                className={className}
            />
        );
    }

    if (type === 'Upgrade') {
        const [, packageId] = data as [string[], string, unknown];
        return (
            <ObjectLink
                objectId={packageId}
                label={formatAddress(packageId)}
                className={className}
            />
        );
    }

    return <Dash />;
}

function ModuleCell({
    type,
    data,
    muted = false,
}: {
    type: string;
    data: unknown;
    muted?: boolean;
}): JSX.Element {
    if (type !== 'MoveCall') {
        return <Dash />;
    }

    const { module, package: movePackage } = data as MoveCallIotaTransaction;
    return (
        <ObjectLink
            objectId={`${movePackage}?module=${module}`}
            label={module}
            showAddressAlias={false}
            className={muted ? MUTED_COLOR : HIGHLIGHT_COLOR}
        />
    );
}

function FunctionCell({
    type,
    data,
    muted = false,
}: {
    type: string;
    data: unknown;
    muted?: boolean;
}): JSX.Element {
    if (type !== 'MoveCall') {
        return <Dash />;
    }

    const { function: func } = data as MoveCallIotaTransaction;
    return (
        <span
            className={
                muted
                    ? 'text-iota-neutral-40 dark:text-iota-neutral-60'
                    : 'text-iota-neutral-10 dark:text-iota-neutral-92'
            }
        >
            {func}
        </span>
    );
}

function HighlightCell({
    highlighted,
    children,
}: {
    highlighted: boolean;
    children: React.ReactNode;
}): JSX.Element {
    return (
        <td
            className={
                highlighted
                    ? 'h-14 border-b border-transparent bg-iota-neutral-92 px-md dark:bg-iota-neutral-12'
                    : 'table-cell-border-color h-14 border-b px-md'
            }
        >
            {children}
        </td>
    );
}

function CommandRow({
    index,
    type,
    data,
    args,
    inputs,
}: {
    index: number;
    type: string;
    data: unknown;
    args: ReturnType<typeof getCommandArguments>;
    inputs: IotaCallArg[];
}): JSX.Element {
    const { isHighlighted } = usePtbHighlight(`command-${index}`);

    return (
        <tr>
            <HighlightCell highlighted={isHighlighted}>
                <IndexCell index={index} />
            </HighlightCell>
            <HighlightCell highlighted={isHighlighted}>
                <Badge type={BadgeType.PrimarySoft} label={type} size={BadgeSize.Small} />
            </HighlightCell>
            <HighlightCell highlighted={isHighlighted}>
                <PackageCell type={type} data={data} muted />
            </HighlightCell>
            <HighlightCell highlighted={isHighlighted}>
                <ModuleCell type={type} data={data} muted />
            </HighlightCell>
            <HighlightCell highlighted={isHighlighted}>
                <FunctionCell type={type} data={data} muted />
            </HighlightCell>
            <HighlightCell highlighted={isHighlighted}>
                <div className="text-body-sm">
                    <ArgCommaList args={args} inputs={inputs} muted />
                </div>
            </HighlightCell>
        </tr>
    );
}

function CommandSignature({ type, data }: { type: string; data: unknown }): JSX.Element | null {
    if (type !== 'MoveCall') {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-[3px]">
            <PackageCell type={type} data={data} />
            <span className="text-iota-neutral-40 dark:text-iota-neutral-60">::</span>
            <ModuleCell type={type} data={data} />
            <span className="text-iota-neutral-40 dark:text-iota-neutral-60">::</span>
            <FunctionCell type={type} data={data} />
        </div>
    );
}

function CombinedCommandCard({
    index,
    type,
    data,
    args,
    usedBy,
    inputs,
}: {
    index: number;
    type: string;
    data: unknown;
    args: ReturnType<typeof getCommandArguments>;
    usedBy: ReturnType<typeof getResultUsedByCommands>;
    inputs: IotaCallArg[];
}): JSX.Element {
    const { isHighlighted } = usePtbHighlight(`command-${index}`);

    return (
        <div
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
                {usedBy.length > 0 && (
                    <span className="inline-flex items-center gap-xxs text-body-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                        <span>→</span>
                        <span>
                            used by{' '}
                            {usedBy.map(({ commandIndex, nestedIndex }, i) => (
                                <HighlightableRef
                                    key={`${commandIndex}-${nestedIndex ?? ''}`}
                                    refId={`command-${commandIndex}`}
                                >
                                    #{commandIndex}
                                    {nestedIndex !== undefined ? `[${nestedIndex}]` : ''}
                                    {i < usedBy.length - 1 ? ', ' : ''}
                                </HighlightableRef>
                            ))}
                        </span>
                    </span>
                )}
            </div>
            {args.length > 0 && (
                <div className="overflow-x-auto pl-lg text-body-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex w-max items-baseline gap-x-xs whitespace-nowrap">
                        <span className="text-iota-neutral-40 dark:text-iota-neutral-60">
                            args: [
                        </span>
                        <ArgCommaList args={args} inputs={inputs} nowrap showInputIndex />
                        <span className="text-iota-neutral-40 dark:text-iota-neutral-60">]</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export function CombinedCommandsList({
    transactions,
    inputs,
}: TransactionsCardProps): JSX.Element | null {
    if (!transactions?.length) {
        return null;
    }

    return (
        <div data-testid="combined-commands-content" className="flex flex-col gap-xs">
            <div className="mb-xs flex items-center gap-xxs text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                <Info className="h-3.5 w-3.5" />
                Hover an argument to see its input and highlight every place it appears
            </div>
            {transactions.map((transaction, index) => {
                const [[type, data]] = Object.entries(transaction);
                const args = getCommandArguments(type, data);
                const usedBy = getResultUsedByCommands(index, transactions);

                return (
                    <CombinedCommandCard
                        key={index}
                        index={index}
                        type={type}
                        data={data}
                        args={args}
                        usedBy={usedBy}
                        inputs={inputs}
                    />
                );
            })}
        </div>
    );
}

export function TransactionsTable({
    transactions,
    inputs,
}: TransactionsCardProps): JSX.Element | null {
    if (!transactions?.length) {
        return null;
    }

    return (
        <div data-testid="transactions-card-content">
            <div className="mb-xs flex items-center gap-xxs text-label-sm text-iota-neutral-40 dark:text-iota-neutral-60">
                <Info className="h-3.5 w-3.5" />
                Hover an argument to highlight every place it appears
            </div>
            <Table rowIndexes={transactions.map((_, index) => index)}>
                <TableHeader>
                    <TableRow>
                        <TableHeaderCell columnKey="index" label="#" />
                        <TableHeaderCell columnKey="type" label="Type" />
                        <TableHeaderCell columnKey="package" label="Package" />
                        <TableHeaderCell columnKey="module" label="Module" />
                        <TableHeaderCell columnKey="function" label="Function" />
                        <TableHeaderCell columnKey="arguments" label="Arguments" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((transaction, index) => {
                        const [[type, data]] = Object.entries(transaction);
                        const args = getCommandArguments(type, data);

                        return (
                            <CommandRow
                                key={index}
                                index={index}
                                type={type}
                                data={data}
                                args={args}
                                inputs={inputs}
                            />
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
