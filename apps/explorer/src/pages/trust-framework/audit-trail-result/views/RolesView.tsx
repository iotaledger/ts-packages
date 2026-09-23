// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Info } from '@iota/apps-ui-icons';
import {
    Badge,
    BadgeType,
    InfoBox,
    InfoBoxStyle,
    InfoBoxType,
    KeyValueInfo,
    TitleSize,
    TooltipPosition,
} from '@iota/apps-ui-kit';
import { Permission, type RoleMap, type RolePermissionsEntry } from '@iota/audit-trails/web';
import { CollapsibleCard } from '~/components';

interface RolesViewProps {
    roles: RoleMap;
}

export function RolesView({ roles }: RolesViewProps): React.JSX.Element {
    return (
        <>
            {roles.roles.length === 0 ? (
                <InfoBox
                    title="No roles found"
                    supportingText="This audit trail has no roles configured."
                    type={InfoBoxType.Default}
                    style={InfoBoxStyle.Elevated}
                    icon={<Info />}
                />
            ) : (
                <div className="flex flex-col gap-sm">
                    {roles.roles.map((role) => (
                        <RoleCard
                            key={role.name}
                            role={role}
                            isAdmin={role.name === roles.initialAdminRoleName}
                        />
                    ))}
                </div>
            )}
        </>
    );
}

interface RoleCardProps {
    role: RolePermissionsEntry;
    isAdmin: boolean;
}

function RoleCard({ role, isAdmin }: RoleCardProps): React.JSX.Element {
    const tags = role.roleTags?.tags ?? [];

    return (
        <CollapsibleCard
            collapsible
            title={role.name}
            titleSize={TitleSize.Small}
            supportingTitleElement={
                isAdmin ? (
                    <div className="ml-1 flex">
                        <Badge label="Admin" type={BadgeType.PrimarySoft} />
                    </div>
                ) : undefined
            }
        >
            <div className="flex flex-col gap-4 py-sm--rs">
                <div className="flex flex-col gap-xs px-md--rs">
                    <KeyValueInfo
                        keyText="Permissions"
                        value={role.permissions.length}
                        fullwidth
                        tooltipPosition={TooltipPosition.Top}
                        tooltipText="Operations a capability holding this role is authorized to perform."
                    />
                    <div className="flex flex-wrap gap-xxs">
                        {role.permissions.map((permission) => (
                            <Badge
                                key={permission}
                                label={Permission[permission as Permission]}
                                type={BadgeType.Neutral}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-xs px-md--rs">
                    <KeyValueInfo
                        keyText="Allowed Tags"
                        value={tags.length === 0 ? 'Any' : tags.length}
                        fullwidth
                        tooltipPosition={TooltipPosition.Top}
                        tooltipText="Record tags this role is restricted to. Without restrictions the role may use any tag."
                    />
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-xxs">
                            {tags.map((tag) => (
                                <Badge key={tag} label={tag} type={BadgeType.Neutral} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </CollapsibleCard>
    );
}
