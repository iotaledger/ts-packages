// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ColumnDef } from '@tanstack/react-table';
import { TableCard } from '../../../../components/ui/TableCard';
import { getPermissionName } from '../permissions';
import { type RolePermissionsEntry, type RoleTags } from '@iota/audit-trail';
import { TableCellBase, TableCellText, Title, Panel } from '@iota/apps-ui-kit';

interface RolesCardProps {
    roles: RolePermissionsEntry[];
}

export function RolesCard({ roles }: RolesCardProps) {
    return (
        <Panel>
            <div data-testid="tx">
                <div className="flex w-full flex-col justify-between gap-xxs p-md--rs sm:flex-row md:items-center">
                    <Title title="Roles" />
                </div>
                <div className="flex flex-col gap-sm p-md--rs">
                    <TableCard
                        data={roles}
                        columns={generateRolesColumns()}
                        defaultSorting={[{ id: 'role', desc: false }]}
                    />
                </div>
            </div>
        </Panel>
    );
}

export function generateRolesColumns(): ColumnDef<RolePermissionsEntry>[] {
    return [
        {
            header: 'Role Name',
            accessorKey: 'name',
            cell: ({ getValue }) => {
                const role = getValue<string>();
                return (
                    <TableCellBase>
                        <TableCellText>{role}</TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Permissions',
            accessorKey: 'permissions',
            cell: ({ getValue }) => {
                const permissions = getValue<number[]>()
                    .map((p: number) => getPermissionName(p))
                    .join(', ');
                return (
                    <TableCellBase>
                        <TableCellText>{permissions}</TableCellText>
                    </TableCellBase>
                );
            },
        },
        {
            header: 'Tags',
            accessorKey: 'roleTags',
            cell: ({ getValue }) => {
                const roleTags = getValue<RoleTags>();
                const tags = !roleTags ? 'N/A' : roleTags.tags.join(', ');
                return (
                    <TableCellBase>
                        <TableCellText>{tags}</TableCellText>
                    </TableCellBase>
                );
            },
        },
        // Note: A column for Tags will be added here in a subsequent step.
    ];
}
