// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { type ColumnDef } from '@tanstack/react-table';
import { TableCard } from '../../../../../components/ui/TableCard';
import { getPermissionName } from './helper';
import { type RolePermissionsEntry, type RoleTags } from '@iota/audit-trail';
import {
    TableCellBase,
    TableCellText,
    Title,
    Panel,
    InfoBox,
    InfoBoxType,
    InfoBoxStyle,
} from '@iota/apps-ui-kit';
import { Info } from '@iota/apps-ui-icons';

interface RolesCardProps {
    roles: RolePermissionsEntry[];
}

export function RolesView({ roles }: RolesCardProps) {
    return (
        <Panel>
            <div className="flex w-full flex-col gap-sm">
                <Title title="Roles" />
                <div className="flex flex-col gap-sm">
                    {roles.length === 0 ? (
                        <InfoBox
                            title="No roles found"
                            supportingText="This audit trail has no roles configured."
                            type={InfoBoxType.Default}
                            style={InfoBoxStyle.Elevated}
                            icon={<Info />}
                        />
                    ) : (
                        <TableCard
                            data={roles}
                            columns={generateRolesColumns()}
                            defaultSorting={[{ id: 'role', desc: false }]}
                        />
                    )}
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
