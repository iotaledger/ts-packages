// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { TableCellBase, TableCellText, ROW_LINK_PROPS } from '@iota/apps-ui-kit';
import { CoinFiatValue, TruncatedBalance } from '@iota/core';
import type { ColumnDef } from '@tanstack/react-table';
import { AddressLink, ObjectLink } from '~/components/ui';
import type { CoinObject } from '~/hooks';

interface GenerateCoinObjectsTableColumnsArgs {
    coinType: string;
    decimals: number;
    symbol: string;
}

export function generateCoinObjectsTableColumns({
    coinType,
    decimals,
    symbol,
}: GenerateCoinObjectsTableColumnsArgs): ColumnDef<CoinObject>[] {
    return [
        {
            header: 'Object',
            accessorKey: 'objectId',
            cell({ getValue }) {
                const objectId = getValue<CoinObject['objectId']>();
                return (
                    <TableCellBase>
                        <ObjectLink {...ROW_LINK_PROPS} objectId={objectId} copyText={objectId} />
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Owner',
            accessorKey: 'owner',
            cell({ getValue }) {
                const owner = getValue<CoinObject['owner']>();
                return (
                    <TableCellBase>
                        {owner?.kind === 'Address' ? (
                            <AddressLink address={owner.address} copyText={owner.address} />
                        ) : owner?.kind === 'Object' ? (
                            <ObjectLink objectId={owner.address} copyText={owner.address} />
                        ) : (
                            <TableCellText>{owner?.kind ?? '--'}</TableCellText>
                        )}
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Balance',
            accessorKey: 'balance',
            cell({ getValue }) {
                const balance = getValue<CoinObject['balance']>();
                return (
                    <TableCellBase>
                        <div className="flex flex-col gap-0.5">
                            <TableCellText supportingLabel={symbol}>
                                <TruncatedBalance
                                    balance={balance}
                                    decimals={decimals}
                                    symbol={symbol}
                                />
                            </TableCellText>
                            <CoinFiatValue
                                amount={balance}
                                coinType={coinType}
                                withParentheses={false}
                            />
                        </div>
                    </TableCellBase>
                );
            },
        },
    ];
}
